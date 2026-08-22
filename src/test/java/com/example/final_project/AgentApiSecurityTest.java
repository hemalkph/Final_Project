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
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
}
