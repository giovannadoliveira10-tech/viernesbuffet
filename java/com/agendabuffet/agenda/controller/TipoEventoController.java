package com.agendabuffet.agenda.controller;

import com.agendabuffet.agenda.model.TipoEvento;
import com.agendabuffet.agenda.repository.EventoRepository;
import com.agendabuffet.agenda.repository.TipoEventoRepository;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/tipos-evento")
public class TipoEventoController {

    private final TipoEventoRepository repo;
    private final EventoRepository eventos;

    public TipoEventoController(TipoEventoRepository repo, EventoRepository eventos) {
        this.repo = repo;
        this.eventos = eventos;
    }

    @GetMapping
    public List<TipoEvento> listar() {
        return repo.findAll(Sort.by("nome"));
    }

    // quantos eventos usam cada tipo (id -> quantidade)
    @GetMapping("/uso")
    public Map<Long, Long> uso() {
        Map<Long, Long> m = new HashMap<>();
        for (Object[] l : eventos.contarPorTipo())
            m.put(((Number) l[0]).longValue(), ((Number) l[1]).longValue());
        return m;
    }

    @PostMapping
    @Transactional
    public ResponseEntity<?> criar(@RequestBody TipoEvento t) {
        String nome = limpar(t.getNome());
        String problema = validar(nome, null);
        if (problema != null) return erro(HttpStatus.BAD_REQUEST, problema);
        TipoEvento novo = new TipoEvento();
        novo.setNome(nome);
        return ResponseEntity.ok(repo.save(novo));
    }

    @PutMapping("/{id}")
    @Transactional
    public ResponseEntity<?> renomear(@PathVariable Long id, @RequestBody TipoEvento t) {
        TipoEvento atual = repo.findById(id).orElse(null);
        if (atual == null) return erro(HttpStatus.NOT_FOUND, "Tipo não encontrado.");
        String nome = limpar(t.getNome());
        String problema = validar(nome, id);
        if (problema != null) return erro(HttpStatus.BAD_REQUEST, problema);
        atual.setNome(nome);
        return ResponseEntity.ok(repo.save(atual));
    }

    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<?> excluir(@PathVariable Long id) {
        if (!repo.existsById(id)) return erro(HttpStatus.NOT_FOUND, "Tipo não encontrado.");
        long usos = eventos.countByTipoEventoId(id);
        if (usos > 0)
            return erro(HttpStatus.BAD_REQUEST, "Este tipo está em uso por " + usos + " evento(s) e não pode ser excluído.");
        repo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ---------- apoio ----------
    private String limpar(String s) {
        return s == null ? "" : s.trim();
    }

    private String validar(String nome, Long idAtual) {
        if (nome.isEmpty()) return "Informe o nome do tipo.";
        if (nome.length() > 60) return "O nome pode ter no máximo 60 caracteres.";
        boolean repetido = repo.findByNomeIgnoreCase(nome)
            .filter(x -> !x.getId().equals(idAtual)).isPresent();
        return repetido ? "Já existe um tipo com esse nome." : null;
    }

    private ResponseEntity<Map<String, String>> erro(HttpStatus status, String msg) {
        return ResponseEntity.status(status).body(Map.of("erro", msg));
    }
}