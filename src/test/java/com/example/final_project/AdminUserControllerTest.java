package com.example.final_project;

import com.example.final_project.model.Role;
import com.example.final_project.model.User;
import com.example.final_project.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.web.context.WebApplicationContext;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.setup.MockMvcBuilders.webAppContextSetup;

/**
 * Regression tests for the Phase 5 read-only Users endpoint.
 *
 * Before this: no admin user-listing endpoint existed at all. Covers the
 * two things that matter for a raw-entity-returning endpoint: it's
 * ADMIN-gated, and the response never leaks the (already @JsonIgnore'd)
 * password field.
 */
@SpringBootTest
@ActiveProfiles("test")
class AdminUserControllerTest {

    private MockMvc mockMvc;

    @Autowired
    private WebApplicationContext webApplicationContext;

    @Autowired
    private UserRepository userRepository;

    @BeforeEach
    void setUp() {
        mockMvc = webAppContextSetup(webApplicationContext)
                .apply(springSecurity())
                .build();

        // Users are referenced by Agent.linkedUser FKs (seeded at startup),
        // so this deliberately doesn't clear the table like other tests do
        // with their own repositories — just ensures our fixture exists.
        if (userRepository.findByEmail("list-test-user@example.com").isEmpty()) {
            userRepository.save(User.builder()
                    .name("List Test User")
                    .email("list-test-user@example.com")
                    .password("irrelevant")
                    .role(Role.USER)
                    .build());
        }
    }

    @Test
    void getAllUsers_asAdmin_returnsUsersWithoutPassword() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .with(user("admin@example.com").roles("ADMIN")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.email=='list-test-user@example.com')].password").doesNotExist());
    }

    @Test
    void getAllUsers_asNonAdmin_isForbidden() throws Exception {
        mockMvc.perform(get("/api/admin/users")
                        .with(user("list-test-user@example.com").roles("USER")))
                .andExpect(status().isForbidden());
    }

    @Test
    void getAllUsers_unauthenticated_isForbidden() throws Exception {
        // No custom AuthenticationEntryPoint is configured, so an
        // unauthenticated request is rejected the same way an
        // authenticated-but-wrong-role one is: 403, not 401.
        mockMvc.perform(get("/api/admin/users"))
                .andExpect(status().isForbidden());
    }
}
