package com.agendabuffet.agenda.controller;

import com.agendabuffet.agenda.model.Configuracao;
import com.agendabuffet.agenda.model.Evento;
import com.agendabuffet.agenda.repository.ConfiguracaoRepository;
import com.agendabuffet.agenda.repository.EventoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@RestController
@RequestMapping("/api/agradecimento")
public class AgradecimentoController {

    public record Modelo(String texto) {}
    public record Marca(LocalDateTime enviadoEm) {}

    private static final String CHAVE = "mensagem_agradecimento";
    private static final String PADRAO =
        "Olá, {cliente}! Foi uma alegria participar do seu {tipo}. "
        + "Esperamos que tenha sido um dia inesquecível. Muito obrigado pela confiança! "
        + "Um abraço, equipe Viernes.";

    private final ConfiguracaoRepository config;
    private final EventoRepository eventos;

    public AgradecimentoController(ConfiguracaoRepository config, EventoRepository eventos) {
        this.config = config;
        this.eventos = eventos;
    }

    @GetMapping("/modelo")
    public Modelo modelo() {
        return new Modelo(config.findById(CHAVE).map(c -> c.valor).orElse(PADRAO));
    }

    @PutMapping("/modelo")
    @Transactional
    public Modelo salvarModelo(@RequestBody Modelo m) {
        if (m.texto() == null || m.texto().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Escreva a mensagem");
        if (m.texto().length() > 1000)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Mensagem muito longa");
        Configuracao c = config.findById(CHAVE).orElseGet(() -> {
            Configuracao n = new Configuracao();
            n.chave = CHAVE;
            return n;
        });
        c.valor = m.texto().trim();
        config.save(c);
        return new Modelo(c.valor);
    }

    @PostMapping("/{id}/enviado")
    @Transactional
    public Marca marcar(@PathVariable Long id) {
        Evento e = buscar(id);
        e.agradecimentoEnviadoEm = LocalDateTime.now();
        eventos.save(e);
        return new Marca(e.agradecimentoEnviadoEm);
    }

    @DeleteMapping("/{id}/enviado")
    @Transactional
    public Marca desmarcar(@PathVariable Long id) {
        Evento e = buscar(id);
        e.agradecimentoEnviadoEm = null;
        eventos.save(e);
        return new Marca(null);
    }

    private Evento buscar(Long id) {
        return eventos.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }
}
