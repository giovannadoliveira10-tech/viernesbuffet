package com.agendabuffet.agenda.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "evento")
public class Evento {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @ManyToOne @JoinColumn(name = "cliente1_id", nullable = false)
    public Cliente cliente1;

    @ManyToOne @JoinColumn(name = "cliente2_id")
    public Cliente cliente2;

    @ManyToOne @JoinColumn(name = "tipo_evento_id", nullable = false)
    public TipoEvento tipoEvento;

    public String status;               // ORCAMENTO, FECHADO ou NAO_PAGO
    public LocalDate dataAtendimento;
    public LocalDate dataConfirmacao;
    public LocalDate dataEvento;
    public LocalTime horaInicio;
    public LocalTime horaFim;

    public Integer convidadosPrevistos;
    public Integer convidadosCompareceram;
    public Integer pagantesInteiros;
    public Integer pagantesMeias;
    public Integer naoPagantes;

    @Column(precision = 10, scale = 2) public BigDecimal valorPorPessoa;
    @Column(precision = 10, scale = 2) public BigDecimal valorBuffet;
    @Column(precision = 10, scale = 2) public BigDecimal valorFinalContrato;
    @Column(precision = 10, scale = 2) public BigDecimal valorVendaReal;
    @Column(precision = 10, scale = 2) public BigDecimal custoVariavel;
    @Column(precision = 10, scale = 2) public BigDecimal totalRecebido;

    public boolean bartenderIncluido;

    @Column(columnDefinition = "TEXT")
    public String observacao;
    public java.time.LocalDateTime agradecimentoEnviadoEm;

    @OneToMany(mappedBy = "evento", cascade = CascadeType.ALL, orphanRemoval = true)
    public List<ProfissionalEvento> profissionais = new ArrayList<>();
}