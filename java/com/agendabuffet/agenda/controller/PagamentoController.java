package com.agendabuffet.agenda.controller;

import com.agendabuffet.agenda.model.Evento;
import com.agendabuffet.agenda.model.Pagamento;
import com.agendabuffet.agenda.repository.EventoRepository;
import com.agendabuffet.agenda.repository.PagamentoRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/eventos/{eventoId}/pagamentos")
public class PagamentoController {

    public record PagamentoRequest(LocalDate data, BigDecimal valor, String forma, String observacao) {}
    public record Resposta(List<Pagamento> pagamentos, BigDecimal total) {}

    private final PagamentoRepository pagamentos;
    private final EventoRepository eventos;

    public PagamentoController(PagamentoRepository pagamentos, EventoRepository eventos) {
        this.pagamentos = pagamentos;
        this.eventos = eventos;
    }

    @GetMapping
    public Resposta listar(@PathVariable Long eventoId, Authentication auth) {
        exigirAdmin(auth);
        buscarEvento(eventoId);
        return montar(eventoId);
    }

    @PostMapping
    @Transactional
    public Resposta criar(@PathVariable Long eventoId, @RequestBody PagamentoRequest r) {
        Evento e = buscarEvento(eventoId);
        if (r.valor() == null || r.valor().signum() <= 0)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe um valor maior que zero");
        if (r.data() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe a data do pagamento");

        Pagamento p = new Pagamento();
        p.evento = e;
        p.data = r.data();
        p.valor = r.valor();
        p.forma = (r.forma() == null || r.forma().isBlank()) ? "PIX" : r.forma();
        p.observacao = r.observacao();
        pagamentos.save(p);
        return atualizarTotal(e);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public Resposta excluir(@PathVariable Long eventoId, @PathVariable Long id) {
        Evento e = buscarEvento(eventoId);
        Pagamento p = pagamentos.findById(id)
            .filter(x -> x.evento.id.equals(eventoId))
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        pagamentos.delete(p);
        pagamentos.flush();
        return atualizarTotal(e);
    }

    // ---------- apoio ----------
    private void exigirAdmin(Authentication auth) {
        if (auth == null || auth.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN")))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
    }

    private Evento buscarEvento(Long id) {
        return eventos.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
    }

    private Resposta montar(Long eventoId) {
        List<Pagamento> lista = pagamentos.findByEventoIdOrderByDataAscIdAsc(eventoId);
        BigDecimal total = lista.stream().map(p -> p.valor).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new Resposta(lista, total);
    }

    // mantém o campo "total recebido" do evento sempre igual à soma dos pagamentos
    private Resposta atualizarTotal(Evento e) {
        Resposta r = montar(e.id);
        e.totalRecebido = r.total();
        eventos.save(e);
        return r;
    }
}
