package com.example.final_project.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Request DTO for minting a Supabase Storage signed upload URL. The client
 * only supplies where the file logically belongs and its type — never a
 * path or filename, since the server always generates the final storage
 * path itself.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SignUploadRequest {

    @NotBlank(message = "Folder is required")
    private String folder;

    @NotBlank(message = "Content type is required")
    private String contentType;
}
