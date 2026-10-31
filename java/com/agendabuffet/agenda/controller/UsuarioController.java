package com.agendabuffet.agenda.controller;

import com.agendabuffet.agenda.model.Usuario;
import com.agendabuffet.agenda.repository.UsuarioRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api")
public class UsuarioController {

    public record UsuarioDto(Long id, String nome, String email, String perfil) {}
    public record NovoUsuario(String nome, String email, String senha, String perfil) {}
    public record TrocaSenha(String senhaAtual, String novaSenha) {}
    public record RedefinirSenha(String novaSenha) {}

    private final UsuarioRepository repo;
    private final PasswordEncoder encoder;

    public UsuarioController(UsuarioRepository repo, PasswordEncoder encoder) {
        this.repo = repo;
        this.encoder = encoder;
    }

    // ---------- só administrador ----------
    @GetMapping("/usuarios")
    public List<UsuarioDto> listar() {
        return repo.findAll().stream()
            .map(u -> new UsuarioDto(u.id, u.nome, u.email, u.perfil))
            .toList();
    }

    @PostMapping("/usuarios")
    @Transactional
    public ResponseEntity<?> criar(@RequestBody NovoUsuario n) {
        String nome = n.nome() == null ? "" : n.nome().trim();
        String email = n.email() == null ? "" : n.email().trim().toLowerCase();
        if (nome.isEmpty()) return erro("Informe o nome.");
        if (!email.matches("^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$")) return erro("E-mail inválido.");
        if (!"ADMIN".equals(n.perfil()) && !"RESTRITO".equals(n.perfil())) return erro("Perfil inválido.");
        String problema = validarSenha(n.senha());
        if (problema != null) return erro(problema);
        if (repo.findByEmail(email).isPresent()) return erro("Já existe um usuário com esse e-mail.");

        Usuario u = new Usuario();
        u.nome = nome;
        u.email = email;
        u.senhaHash = encoder.encode(n.senha());
        u.perfil = n.perfil();
        repo.save(u);
        return ResponseEntity.ok(new UsuarioDto(u.id, u.nome, u.email, u.perfil));
    }

    @PutMapping("/usuarios/{id}/senha")
    @Transactional
    public ResponseEntity<?> redefinir(@PathVariable Long id, @RequestBody RedefinirSenha r) {
        Usuario u = repo.findById(id).orElse(null);
        if (u == null) return naoEncontrado();
        String problema = validarSenha(r.novaSenha());
        if (problema != null) return erro(problema);
        u.senhaHash = encoder.encode(r.novaSenha());
        repo.save(u);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/usuarios/{id}")
    @Transactional
    public ResponseEntity<?> excluir(@PathVariable Long id, Authentication auth) {
        Usuario u = repo.findById(id).orElse(null);
        if (u == null) return naoEncontrado();
        if (u.email.equalsIgnoreCase(auth.getName())) return erro("Você não pode excluir o seu próprio usuário.");
        if ("ADMIN".equals(u.perfil) && repo.countByPerfil("ADMIN") <= 1)
            return erro("É preciso manter pelo menos um administrador.");
        repo.delete(u);
        return ResponseEntity.noContent().build();
    }

    // ---------- qualquer usuário logado ----------
    @PostMapping("/me/senha")
    @Transactional
    public ResponseEntity<?> trocarMinha(@RequestBody TrocaSenha t, Authentication auth) {
        Usuario u = repo.findByEmail(auth.getName()).orElse(null);
        if (u == null) return naoEncontrado();
        if (t.senhaAtual() == null || !encoder.matches(t.senhaAtual(), u.senhaHash))
            return erro("A senha atual está incorreta.");
        String problema = validarSenha(t.novaSenha());
        if (problema != null) return erro(problema);
        u.senhaHash = encoder.encode(t.novaSenha());
        repo.save(u);
        return ResponseEntity.noContent().build();
    }

    // ---------- apoio ----------
    private String validarSenha(String s) {
        if (s == null || s.length() < 10) return "A senha precisa ter pelo menos 10 caracteres.";
        if (s.length() > 72) return "A senha pode ter no máximo 72 caracteres.";
        return null;
    }

    private ResponseEntity<Map<String, String>> erro(String msg) {
        return ResponseEntity.badRequest().body(Map.of("erro", msg));
    }

    private ResponseEntity<Map<String, String>> naoEncontrado() {
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("erro", "Usuário não encontrado."));
    }
}