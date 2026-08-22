package com.example.final_project;

import com.example.final_project.model.Agent;
import com.example.final_project.model.AgentStatus;
import com.example.final_project.model.Role;
import com.example.final_project.model.User;
import com.example.final_project.repository.AgentRepository;
import com.example.final_project.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

/**
 * Regression tests for the Agent API fixes.
 *
 * Grows across the three Phase 2a commits:
 * 1. updateAgent must persist `location` (it was silently dropped)
 * 2. public agent JSON must not expose the linked User account
 * 3. createAgent must not trust client-supplied id / createdAt / linkedUser
 */
@SpringBootTest
@ActiveProfiles("test")
class AgentApiSecurityTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private AgentRepository agentRepository;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        mockMvc = webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();
        agentRepository.deleteAll();
    }

    @Test
    void updateAgent_persistsLocation() throws Exception {
        Agent saved = agentRepository.save(Agent.builder()
                .name("Location Test Agent")
                .email("location-test@example.com")
                .title("Consultant")
                .location("Colombo")
                .status(AgentStatus.ACTIVE)
                .build());

        String body = """
                {
                  "name": "Location Test Agent",
                  "email": "location-test@example.com",
                  "title": "Consultant",
                  "location": "Kandy",
                  "status": "ACTIVE"
                }
                """;

        mockMvc.perform(put("/api/agents/" + saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.location").value("Kandy"));

        // Re-read from the database, not just the response body, to prove it persisted.
        Agent reloaded = agentRepository.findById(saved.getId()).orElseThrow();
        assertEquals("Kandy", reloaded.getLocation(),
                "updateAgent must persist a changed location");
    }

    @Test
    void publicAgentJson_doesNotExposeLinkedUser() throws Exception {
        User linked = userRepository.save(User.builder()
                .name("Public Leak Probe")
                .email("public-leak-probe@example.com")
                .password("must-never-be-serialized")
                .role(Role.AGENT)
                .enabled(true)
                .build());

        agentRepository.save(Agent.builder()
                .name("Public Agent")
                .email("public-agent@example.com")
                .title("Consultant")
                .linkedUser(linked)
                .status(AgentStatus.ACTIVE)
                .build());

        // Unauthenticated - /api/agents/public is intentionally open.
        String json = mockMvc.perform(get("/api/agents/public"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].name").value("Public Agent"))
                .andExpect(jsonPath("$[0].linkedUser").doesNotExist())
                .andReturn()
                .getResponse()
                .getContentAsString();

        assertFalse(json.contains("password"),
                "public agent JSON must not contain a password field");
        assertFalse(json.contains("hibernateLazyInitializer"),
                "public agent JSON must not leak Hibernate proxy internals");
        assertFalse(json.contains("public-leak-probe@example.com"),
                "public agent JSON must not expose the linked account's email");
    }

    @Test
    void updateAgent_doesNotReassignLinkedUser() throws Exception {
        User linked = userRepository.save(User.builder()
                .name("Linked Agent User")
                .email("linked-agent@example.com")
                .password("irrelevant")
                .role(Role.AGENT)
                .enabled(true)
                .build());
        User other = userRepository.save(User.builder()
                .name("Other Account")
                .email("other-account@example.com")
                .password("irrelevant")
                .role(Role.USER)
                .enabled(true)
                .build());

        Agent saved = agentRepository.save(Agent.builder()
                .name("Linkage Test Agent")
                .email("linkage-test@example.com")
                .title("Consultant")
                .linkedUser(linked)
                .status(AgentStatus.ACTIVE)
                .build());

        // linkedUser is @JsonIgnore'd, so Jackson simply drops this property
        // on the way in - it's not even a validation error, it's ignored.
        String body = """
                {
                  "name": "Linkage Test Agent",
                  "email": "linkage-test@example.com",
                  "title": "Consultant",
                  "status": "ACTIVE",
                  "linkedUser": { "id": %d }
                }
                """.formatted(other.getId());

        mockMvc.perform(put("/api/agents/" + saved.getId())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isOk());

        Agent reloaded = agentRepository.findById(saved.getId()).orElseThrow();
        assertNotNull(reloaded.getLinkedUser(), "existing linkage must be preserved");
        assertEquals(linked.getId(), reloaded.getLinkedUser().getId(),
                "updateAgent must not let the request body reassign linkedUser");
    }

    @Test
    void createAgent_ignoresClientSuppliedId() throws Exception {
        Agent existing = agentRepository.save(Agent.builder()
                .name("Pre-existing Agent")
                .email("pre-existing@example.com")
                .title("Consultant")
                .status(AgentStatus.ACTIVE)
                .build());

        String body = """
                {
                  "id": %d,
                  "name": "Overwrite Attempt",
                  "email": "overwrite-attempt@example.com",
                  "title": "Impostor",
                  "status": "ACTIVE"
                }
                """.formatted(existing.getId());

        mockMvc.perform(post("/api/agents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isOk());

        // The pre-existing agent must be untouched...
        Agent reloaded = agentRepository.findById(existing.getId()).orElseThrow();
        assertEquals("Pre-existing Agent", reloaded.getName(),
                "createAgent must not overwrite an existing row via a client-supplied id");

        // ...and a genuinely new row must exist alongside it.
        assertEquals(2, agentRepository.count(), "createAgent must insert a new agent");
    }

    @Test
    void createAgent_ignoresClientSuppliedCreatedAt() throws Exception {
        String body = """
                {
                  "name": "Backdated Agent",
                  "email": "backdated@example.com",
                  "title": "Consultant",
                  "status": "ACTIVE",
                  "createdAt": "1999-01-01T00:00:00"
                }
                """;

        mockMvc.perform(post("/api/agents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isOk());

        Agent created = agentRepository.findByEmail("backdated@example.com").orElseThrow();
        assertNotNull(created.getCreatedAt(), "createdAt must be set server-side");
        assertNotEquals(1999, created.getCreatedAt().getYear(),
                "createAgent must ignore a client-supplied createdAt");
    }

    @Test
    void createAgent_ignoresClientSuppliedLinkedUser() throws Exception {
        User victim = userRepository.save(User.builder()
                .name("Unrelated Account")
                .email("unrelated-account@example.com")
                .password("irrelevant")
                .role(Role.USER)
                .enabled(true)
                .build());

        // linkedUser is @JsonIgnore'd (Fix 2), so this property is dropped
        // on the way in regardless. createAgent() also clears it explicitly
        // (Fix 3) - this test pins that server-side guarantee directly
        // rather than relying on the Jackson annotation as the only
        // boundary, per the plan's "do not rely on deserialization failure
        // as the security boundary" requirement.
        String body = """
                {
                  "name": "Hijack Attempt",
                  "email": "hijack-attempt@example.com",
                  "title": "Consultant",
                  "status": "ACTIVE",
                  "linkedUser": { "id": %d }
                }
                """.formatted(victim.getId());

        mockMvc.perform(post("/api/agents")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body)
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isOk());

        Agent created = agentRepository.findByEmail("hijack-attempt@example.com").orElseThrow();
        assertNull(created.getLinkedUser(),
                "createAgent must not link a new agent to a client-supplied user account");
    }
}
