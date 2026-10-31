package com.agendabuffet.agenda.controller;

import com.agendabuffet.agenda.model.*;
import com.agendabuffet.agenda.repository.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

@RestController
@RequestMapping("/api/eventos")
public class EventoController {

    // "hoje" sempre no horário de Brasília, mesmo que o servidor esteja em outro
    // fuso
    private static final ZoneId FUSO = ZoneId.of("America/Sao_Paulo");

    private final EventoRepository eventos;
    private final ClienteRepository clientes;
    private final TipoEventoRepository tipos;

    @PersistenceContext
    private EntityManager em;

    public EventoController(EventoRepository eventos, ClienteRepository clientes, TipoEventoRepository tipos) {
        this.eventos = eventos;
        this.clientes = clientes;
        this.tipos = tipos;
    }

    // ---------- consultas ----------

    // mes de 1 a 12
    @GetMapping
    public List<Evento> listar(@RequestParam int mes, @RequestParam int ano, Authentication auth) {
        LocalDate inicio = LocalDate.of(ano, mes, 1);
        LocalDate fim = inicio.withDayOfMonth(inicio.lengthOfMonth());
        List<Evento> lista = eventos.findByDataEventoBetweenOrderByDataEventoAscHoraInicioAsc(inicio, fim);
        if (restrito(auth))
            lista.forEach(this::esconderValores);
        return lista;
    }

    // todos os eventos de hoje em diante (até 300), do mais próximo para o mais
    // distante
    @GetMapping("/futuros")
    public List<Evento> futuros(Authentication auth) {
        List<Evento> lista = eventos
                .findTop300ByDataEventoGreaterThanEqualOrderByDataEventoAscHoraInicioAsc(LocalDate.now(FUSO));
        if (restrito(auth))
            lista.forEach(this::esconderValores);
        return lista;
    }

    // todos os eventos antes de hoje (até 300), do mais recente para o mais antigo
    @GetMapping("/passados")
    public List<Evento> passados(Authentication auth) {
        List<Evento> lista = eventos
                .findTop300ByDataEventoLessThanOrderByDataEventoDescHoraInicioDesc(LocalDate.now(FUSO));
        if (restrito(auth))
            lista.forEach(this::esconderValores);
        return lista;
    }

    @GetMapping("/{id}")
    public Evento buscar(@PathVariable Long id, Authentication auth) {
        Evento e = eventos.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (restrito(auth))
            esconderValores(e);
        return e;
    }

    // ---------- gravação ----------

    @PostMapping
    @Transactional
    public Evento criar(@RequestBody EventoRequest r) {
        validar(r);
        return salvar(new Evento(), r);
    }

    @PutMapping("/{id}")
    @Transactional
    public Evento atualizar(@PathVariable Long id, @RequestBody EventoRequest r) {
        validar(r);
        Evento e = eventos.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        return salvar(e, r);
    }

    @DeleteMapping("/{id}")
    @Transactional
    public void excluir(@PathVariable Long id) {
        if (!eventos.existsById(id))
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        eventos.deleteById(id);
    }

    // ---------- perfil restrito ----------

    private boolean restrito(Authentication auth) {
        return auth == null || auth.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
    }

    private void esconderValores(Evento e) {
        e.profissionais.size(); // carrega a lista antes de soltar o objeto
        em.detach(e); // solta do banco: as alterações abaixo nunca são gravadas
        e.valorPorPessoa = null;
        e.valorBuffet = null;
        e.valorFinalContrato = null;
        e.valorVendaReal = null;
        e.custoVariavel = null;
        e.totalRecebido = null;
    }

    // ---------- validação e gravação ----------

    private void validar(EventoRequest r) {
        if (r.cliente1Nome() == null || r.cliente1Nome().isBlank())
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o nome do cliente 1");
        if (r.dataEvento() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe a data do evento");
        if (r.tipoEventoId() == null)
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Informe o tipo de evento");
    }

    private Evento salvar(Evento e, EventoRequest r) {
        // cliente 1: nome, sobrenome, e-mail e Telefone 1
        Cliente c1 = r.cliente1Novo() ? new Cliente() : resolverCliente(r.cliente1Id(), e.cliente1);
        c1.nome = r.cliente1Nome();
        c1.sobrenome = r.cliente1Sobrenome() == null ? "" : r.cliente1Sobrenome(); // a coluna não aceita nulo
        c1.email = r.cliente1Email();
        c1.telefone1 = r.telefone1();
        clientes.save(c1);
        e.cliente1 = c1;

        // cliente 2 (opcional): nome, sobrenome, e-mail e Telefone 2 (guardado como
        // telefone dele)
        if (r.cliente2Nome() != null && !r.cliente2Nome().isBlank()) {
            Cliente c2 = r.cliente2Novo() ? new Cliente() : resolverCliente(r.cliente2Id(), e.cliente2);
            c2.nome = r.cliente2Nome();
            c2.sobrenome = r.cliente2Sobrenome() == null ? "" : r.cliente2Sobrenome();
            c2.email = r.cliente2Email();
            c2.telefone1 = r.telefone2();
            clientes.save(c2);
            e.cliente2 = c2;
        } else {
            e.cliente2 = null;
        }

        e.tipoEvento = tipos.findById(r.tipoEventoId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Tipo de evento inválido"));
        e.status = (r.status() == null || r.status().isBlank()) ? "ORCAMENTO" : r.status();
        e.dataAtendimento = r.dataAtendimento();
        e.dataConfirmacao = r.dataConfirmacao();
        e.dataEvento = r.dataEvento();
        e.horaInicio = r.horaInicio();
        e.horaFim = r.horaFim();
        e.convidadosPrevistos = r.convidadosPrevistos();
        e.convidadosCompareceram = r.convidadosCompareceram();
        e.pagantesInteiros = r.pagantesInteiros();
        e.pagantesMeias = r.pagantesMeias();
        e.naoPagantes = r.naoPagantes();
        e.valorPorPessoa = r.valorPorPessoa();
        e.valorBuffet = r.valorBuffet();
        e.valorFinalContrato = r.valorFinalContrato();
        e.valorVendaReal = r.valorVendaReal();
        e.custoVariavel = r.custoVariavel();
        e.totalRecebido = r.totalRecebido();
        e.bartenderIncluido = r.bartenderIncluido();
        e.observacao = r.observacao();

        e.profissionais.clear();
        addProfissional(e, "CERIMONIALISTA", r.cerimonialistaNome(), r.cerimonialistaTelefone());
        addProfissional(e, "ORGANIZADOR", r.organizadorNome(), r.organizadorTelefone());
        addProfissional(e, "DJ", r.djNome(), r.djTelefone());

        return eventos.save(e);
    }

    private Cliente resolverCliente(Long id, Cliente atual) {
        if (id != null) {
            return clientes.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cliente inválido"));
        }
        return atual != null ? atual : new Cliente();
    }

    private void addProfissional(Evento e, String funcao, String nome, String telefone) {
        if (nome == null || nome.isBlank())
            return;
        ProfissionalEvento p = new ProfissionalEvento();
        p.evento = e;
        p.funcao = funcao;
        p.nome = nome;
        p.telefone = telefone;
        e.profissionais.add(p);
    }
}