package com.example.final_project;

import com.example.final_project.model.Agent;
import com.example.final_project.model.AgentStatus;
import com.example.final_project.repository.AgentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
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

}
