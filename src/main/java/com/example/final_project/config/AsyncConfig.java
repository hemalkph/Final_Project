package com.example.final_project.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableAsync;

/**
 * Without this, @Async on EmailService.sendEmail() is silently ignored —
 * Spring runs it synchronously on the caller's thread, so any email failure
 * (e.g. unconfigured SMTP credentials) propagates back through
 * SellerService's @Transactional approve/reject methods and 500s the whole
 * request instead of failing the email send in the background.
 */
@Configuration
@EnableAsync
public class AsyncConfig {
}
