package com.agendabuffet.agenda.controller;

import com.agendabuffet.agenda.model.Usuario;
import com.agendabuffet.agenda.repository.UsuarioRepository;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class MeController {

    public record Eu(String nome, String perfil) {}

    private final UsuarioRepository repo;

    public MeController(UsuarioRepository repo) {
        this.repo = repo;
    }

    @GetMapping("/api/me")
    public Eu eu(Authentication auth) {
        Usuario u = repo.findByEmail(auth.getName()).orElseThrow();
        return new Eu(u.nome, u.perfil);
    }
}