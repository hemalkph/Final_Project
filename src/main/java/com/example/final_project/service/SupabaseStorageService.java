package com.example.final_project.service;

import com.example.final_project.dto.SignUploadRequest;
import com.example.final_project.dto.SignUploadResponse;
import lombok.Data;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.server.ResponseStatusException;

import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Mints short-lived Supabase Storage signed upload URLs using the service
 * role key. The key never leaves this service — callers only ever receive a
 * signed URL for one specific, server-generated object path. Same content
 * type whitelist as FileStorageService, kept independent since this targets
 * a different storage backend (Supabase Storage, not local disk).
 */
@Service
@Slf4j
public class SupabaseStorageService {

    // Deliberately kept in exact lockstep with the bucket's own
    // allowed_mime_types. FileStorageService also accepts "image/jpg", but
    // that alias is NOT in the bucket's list, so minting a URL for it would
    // hand the browser an upload that Supabase is guaranteed to reject.
    // Browsers emit "image/jpeg" for .jpg files anyway.
    private static final Map<String, String> ALLOWED_CONTENT_TYPES = Map.of(
            "image/jpeg", "jpg",
            "image/png", "png",
            "image/webp", "webp");

    @Value("${supabase.storage.url:}")
    private String supabaseUrl;

    @Value("${supabase.storage.service-role-key:}")
    private String serviceRoleKey;

    @Value("${supabase.storage.bucket:media}")
    private String bucket;

    private final RestClient restClient = RestClient.create();

    public SignUploadResponse createSignedUploadUrl(SignUploadRequest request) {
        if (supabaseUrl.isBlank() || serviceRoleKey.isBlank()) {
            throw new RuntimeException(
                    "Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.");
        }

        String extension = ALLOWED_CONTENT_TYPES.get(request.getContentType().toLowerCase());
        if (extension == null) {
            log.warn("Rejected signed-upload request - invalid content type: {}", request.getContentType());
            // 400, not the codebase's usual bare RuntimeException (which Spring
            // maps to 500): the uploader has to tell "your file is unsupported"
            // apart from "the server broke", and only the status code can.
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid file type. Only JPEG, PNG, and WebP images are allowed. Received: "
                            + request.getContentType());
        }

        String folder = sanitizeFolder(request.getFolder());
        String path = folder + "/" + UUID.randomUUID() + "." + extension;
        String storageApiBase = supabaseUrl.replaceAll("/+$", "") + "/storage/v1";

        SupabaseSignResponse supabaseResponse = restClient.post()
                .uri(storageApiBase + "/object/upload/sign/" + bucket + "/" + path)
                .header("Authorization", "Bearer " + serviceRoleKey)
                .header("apikey", serviceRoleKey)
                .retrieve()
                .body(SupabaseSignResponse.class);

        if (supabaseResponse == null || supabaseResponse.token == null) {
            throw new RuntimeException("Supabase did not return a signed upload token for path: " + path);
        }

        String uploadUrl = storageApiBase + "/object/upload/sign/" + bucket + "/" + path
                + "?token=" + supabaseResponse.token;
        String publicUrl = storageApiBase + "/object/public/" + bucket + "/" + path;

        log.info("Minted Supabase signed upload URL for {}", path);

        return SignUploadResponse.builder()
                .signedUrl(uploadUrl)
                .path(path)
                .publicUrl(publicUrl)
                .build();
    }

    // Only used to namespace storage paths (e.g. "properties", "agents") -
    // never trusted as part of a real filesystem/URL path from the client,
    // so anything but a plain lowercase word is rejected outright.
    private static final Set<String> ALLOWED_FOLDERS = Set.of(
            "properties", "agents", "logos", "banners", "avatars", "content");

    private String sanitizeFolder(String folder) {
        String normalized = folder == null ? "" : folder.trim().toLowerCase();
        if (!ALLOWED_FOLDERS.contains(normalized)) {
            log.warn("Rejected signed-upload request - invalid folder: {}", folder);
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid upload folder: " + folder);
        }
        return normalized;
    }

    @Data
    private static class SupabaseSignResponse {
        private String signedUrl;
        private String token;
        private String path;
    }
}
