package com.agendabuffet.agenda.config;

import com.agendabuffet.agenda.model.Usuario;
import com.agendabuffet.agenda.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class InicializadorUsuarios implements CommandLineRunner {

    private final UsuarioRepository repo;
    private final PasswordEncoder encoder;

    @Value("${app.admin.email:}") private String adminEmail;
    @Value("${app.admin.senha:}") private String adminSenha;
    @Value("${app.restrito.email:}") private String restritoEmail;
    @Value("${app.restrito.senha:}") private String restritoSenha;

    public InicializadorUsuarios(UsuarioRepository repo, PasswordEncoder encoder) {
        this.repo = repo;
        this.encoder = encoder;
    }

    @Override
    public void run(String... args) {
        criar("Administrador", adminEmail, adminSenha, "ADMIN");
        criar("Acesso restrito", restritoEmail, restritoSenha, "RESTRITO");
    }

    private void criar(String nome, String email, String senha, String perfil) {
        if (email == null || email.isBlank() || senha == null || senha.isBlank()) return;
        if (repo.findByEmail(email).isPresent()) return;
        Usuario u = new Usuario();
        u.nome = nome;
        u.email = email;
        u.senhaHash = encoder.encode(senha);
        u.perfil = perfil;
        repo.save(u);
    }
}
