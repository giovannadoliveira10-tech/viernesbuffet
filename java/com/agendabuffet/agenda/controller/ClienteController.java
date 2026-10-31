package com.agendabuffet.agenda.controller;

import com.agendabuffet.agenda.model.Cliente;
import com.agendabuffet.agenda.repository.ClienteRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    public record ClienteRequest(String nome, String sobrenome, String email, String telefone1, String telefone2) {}

    private final ClienteRepository repo;

    public ClienteController(ClienteRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Cliente> buscar(@RequestParam(defaultValue = "") String busca,
                                @RequestParam(defaultValue = "8") int limite) {
        String q = busca.trim();
        if (q.length() < 2) return List.of();
        return repo.buscar(q, PageRequest.of(0, Math.max(1, Math.min(limite, 50))));
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> criar(@RequestBody ClienteRequest r) {
        String problema = validar(r);
        if (problema != null) return erro(problema);
        Cliente c = new Cliente();
        preencher(c, r);
        return ResponseEntity.ok(repo.save(c));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> atualizar(@PathVariable Long id, @RequestBody ClienteRequest r) {
        Cliente c = repo.findById(id).orElse(null);
        if (c == null)
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of("erro", "Cliente não encontrado."));
        String problema = validar(r);
        if (problema != null) return erro(problema);
        preencher(c, r);
        return ResponseEntity.ok(repo.save(c));
    }

    // ---------- apoio ----------
    private String validar(ClienteRequest r) {
        if (r.nome() == null || r.nome().isBlank()) return "Informe o nome do cliente.";
        if (r.nome().trim().length() > 80) return "O nome pode ter no máximo 80 caracteres.";
        if (r.sobrenome() != null && r.sobrenome().trim().length() > 80) return "O sobrenome pode ter no máximo 80 caracteres.";
        if (r.email() != null && r.email().trim().length() > 150) return "O e-mail pode ter no máximo 150 caracteres.";
        if (r.telefone1() != null && r.telefone1().trim().length() > 20) return "O telefone 1 pode ter no máximo 20 caracteres.";
        if (r.telefone2() != null && r.telefone2().trim().length() > 20) return "O telefone 2 pode ter no máximo 20 caracteres.";
        return null;
    }

    private void preencher(Cliente c, ClienteRequest r) {
        c.nome = r.nome().trim();
        c.sobrenome = r.sobrenome() == null ? "" : r.sobrenome().trim();   // a coluna não aceita nulo
        c.email = vazioParaNulo(r.email());
        c.telefone1 = vazioParaNulo(r.telefone1());
        c.telefone2 = vazioParaNulo(r.telefone2());
    }

    private String vazioParaNulo(String s) {
        return (s == null || s.isBlank()) ? null : s.trim();
    }

    private ResponseEntity<Map<String, String>> erro(String msg) {
        return ResponseEntity.badRequest().body(Map.of("erro", msg));
    }
}