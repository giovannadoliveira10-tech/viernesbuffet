package com.agendabuffet.agenda.controller;

import com.agendabuffet.agenda.model.AnoAgenda;
import com.agendabuffet.agenda.repository.AnoAgendaRepository;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@RestController
@RequestMapping("/api/anos")
public class AnoController {

    public record AnoRequest(Integer ano) {}

    private final AnoAgendaRepository repo;

    public AnoController(AnoAgendaRepository repo) {
        this.repo = repo;
    }

    @GetMapping
    public List<Integer> listar() {
        return repo.findAllByOrderByAnoAsc().stream().map(a -> a.ano).toList();
    }

    @PostMapping
    public Integer criar(@RequestBody AnoRequest r) {
        if (r.ano() == null || r.ano() < 2000 || r.ano() > 2100)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Ano inválido");
        repo.save(new AnoAgenda(r.ano()));
        return r.ano();
    }
}
