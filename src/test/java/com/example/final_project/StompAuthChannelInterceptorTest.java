package com.example.final_project;

import com.example.final_project.config.StompAuthChannelInterceptor;
import com.example.final_project.model.Role;
import com.example.final_project.model.User;
import com.example.final_project.repository.UserRepository;
import com.example.final_project.service.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.messaging.Message;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

/**
 * Regression tests for the Phase 4a STOMP handshake auth fix.
 *
 * Before this: /ws was fully unauthenticated — any client could CONNECT and
 * subscribe to any /topic/**, including /topic/admin/inquiries (live
 * customer inquiry data). These tests cover the two things
 * StompAuthChannelInterceptor now enforces: a valid JWT is required to
 * CONNECT, and only ADMIN-role principals may SUBSCRIBE to /topic/admin/**.
 */
@SpringBootTest
@ActiveProfiles("test")
class StompAuthChannelInterceptorTest {

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserDetailsService userDetailsService;

    @Autowired
    private UserRepository userRepository;

    private StompAuthChannelInterceptor interceptor;
    private String adminToken;
    private String userToken;

    @BeforeEach
    void setUp() {
        interceptor = new StompAuthChannelInterceptor(jwtService, userDetailsService);
        userRepository.deleteAll();

        User admin = userRepository.save(User.builder()
                .name("Stomp Test Admin")
                .email("stomp-admin@example.com")
                .password("irrelevant")
                .role(Role.ADMIN)
                .build());
        User user = userRepository.save(User.builder()
                .name("Stomp Test User")
                .email("stomp-user@example.com")
                .password("irrelevant")
                .role(Role.USER)
                .build());

        adminToken = jwtService.generateToken(admin);
        userToken = jwtService.generateToken(user);
    }

    private Message<byte[]> connectFrame(String bearerToken) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        if (bearerToken != null) {
            accessor.setNativeHeader("Authorization", "Bearer " + bearerToken);
        }
        // Matches how Spring's own StompSubProtocolHandler builds inbound
        // frames — leaves headers mutable so an interceptor's preSend can
        // call accessor.setUser(...) on the message it's handed.
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    private Message<byte[]> subscribeFrame(String destination, Authentication user) {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination(destination);
        if (user != null) {
            accessor.setUser(user);
        }
        accessor.setLeaveMutable(true);
        return MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders());
    }

    @Test
    void connect_withValidAdminToken_setsAuthenticatedUser() {
        Message<?> result = interceptor.preSend(connectFrame(adminToken), null);
        StompHeaderAccessor accessor = StompHeaderAccessor.wrap(result);
        assertNotNull(accessor.getUser());
        assertEquals("stomp-admin@example.com", accessor.getUser().getName());
    }

    @Test
    void connect_withMissingToken_throwsBadCredentials() {
        assertThrows(BadCredentialsException.class, () -> interceptor.preSend(connectFrame(null), null));
    }

    @Test
    void connect_withGarbageToken_throwsBadCredentials() {
        assertThrows(BadCredentialsException.class, () -> interceptor.preSend(connectFrame("not-a-real-jwt"), null));
    }

    @Test
    void subscribeAdminTopic_withAdminUser_isAllowed() {
        Authentication admin = new UsernamePasswordAuthenticationToken(
                userRepository.findByEmail("stomp-admin@example.com").orElseThrow(), null,
                userRepository.findByEmail("stomp-admin@example.com").orElseThrow().getAuthorities());

        Message<?> result = interceptor.preSend(subscribeFrame("/topic/admin/inquiries", admin), null);
        assertNotNull(result);
    }

    @Test
    void subscribeAdminTopic_withNonAdminUser_isDenied() {
        Authentication user = new UsernamePasswordAuthenticationToken(
                userRepository.findByEmail("stomp-user@example.com").orElseThrow(), null,
                userRepository.findByEmail("stomp-user@example.com").orElseThrow().getAuthorities());

        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(subscribeFrame("/topic/admin/inquiries", user), null));
    }

    @Test
    void subscribeAdminTopic_withNoUser_isDenied() {
        assertThrows(AccessDeniedException.class,
                () -> interceptor.preSend(subscribeFrame("/topic/admin/inquiries", null), null));
    }

    @Test
    void subscribeNonAdminTopic_withNoUser_isAllowed() {
        // /topic/users/** and /topic/agents/** aren't gated by this
        // interceptor — only /topic/admin/** requires ADMIN.
        Message<?> result = interceptor.preSend(subscribeFrame("/topic/users/5/inquiries/10", null), null);
        assertNotNull(result);
    }
}
