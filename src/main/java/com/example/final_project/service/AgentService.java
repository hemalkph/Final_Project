package com.example.final_project.service;

import com.example.final_project.model.Agent;
import com.example.final_project.model.AgentStatus;
import com.example.final_project.repository.AgentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AgentService {

    private final AgentRepository agentRepository;

    public List<Agent> getAllAgents() {
        return agentRepository.findAll();
    }

    public List<Agent> getActiveAgents() {
        return agentRepository.findByStatus(AgentStatus.ACTIVE);
    }

    public Agent getAgentById(Long id) {
        return agentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Agent not found with id: " + id));
    }

    public Agent createAgent(Agent agent) {
        // POST /api/agents binds a raw entity from the request body, so
        // these three fields are server-controlled regardless of what the
        // client sends: a supplied id turns save() into a merge, silently
        // overwriting an existing agent; a supplied createdAt would stick
        // because @PrePersist only fires on true inserts; linkedUser is
        // already @JsonIgnore'd (so Jackson won't bind it from JSON), but
        // this clears it explicitly rather than relying on that alone -
        // the entity's own createAgent(Agent) contract shouldn't depend on
        // which layer happens to be calling it.
        agent.setId(null);
        agent.setCreatedAt(null);
        agent.setLinkedUser(null);

        if (agent.getStatus() == null) {
            agent.setStatus(AgentStatus.ACTIVE);
        }
        if (agent.getRating() == null) {
            agent.setRating(5.0);
        }
        if (agent.getPropertiesSold() == null) {
            agent.setPropertiesSold(0);
        }
        return agentRepository.save(agent);
    }

    public Agent updateAgent(Long id, Agent updatedAgent) {
        Agent existingAgent = agentRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Agent not found with id: " + id));

        existingAgent.setName(updatedAgent.getName());
        existingAgent.setEmail(updatedAgent.getEmail());
        existingAgent.setPhone(updatedAgent.getPhone());
        existingAgent.setProfileImageUrl(updatedAgent.getProfileImageUrl());
        existingAgent.setTitle(updatedAgent.getTitle());
        existingAgent.setBio(updatedAgent.getBio());
        existingAgent.setQualifications(updatedAgent.getQualifications());
        existingAgent.setDegree(updatedAgent.getDegree());
        existingAgent.setExperience(updatedAgent.getExperience());
        existingAgent.setSpecialization(updatedAgent.getSpecialization());
        existingAgent.setLocation(updatedAgent.getLocation());
        existingAgent.setPropertiesSold(updatedAgent.getPropertiesSold());
        existingAgent.setRating(updatedAgent.getRating());
        existingAgent.setStatus(updatedAgent.getStatus());
        // linkedUser is deliberately NOT copied: the agent-to-login-account
        // linkage is server-owned and must not be reassignable through the
        // admin JSON API.

        return agentRepository.save(existingAgent);
    }

    public void deleteAgent(Long id) {
        agentRepository.deleteById(id);
    }

    public long countActiveAgents() {
        return agentRepository.countByStatus(AgentStatus.ACTIVE);
    }

    public long countAllAgents() {
        return agentRepository.count();
    }
}
