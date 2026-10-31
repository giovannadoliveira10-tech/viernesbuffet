package com.agendabuffet.agenda.controller;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

public record EventoRequest(
    Long cliente1Id, Long cliente2Id, boolean cliente1Novo, boolean cliente2Novo,
    String cliente1Nome, String cliente1Sobrenome, String cliente1Email, String telefone1, String telefone2,
    String cliente2Nome, String cliente2Sobrenome, String cliente2Email,
    Long tipoEventoId, String status,
    LocalDate dataAtendimento, LocalDate dataConfirmacao, LocalDate dataEvento,
    LocalTime horaInicio, LocalTime horaFim,
    Integer convidadosPrevistos, Integer convidadosCompareceram,
    Integer pagantesInteiros, Integer pagantesMeias, Integer naoPagantes,
    BigDecimal valorPorPessoa, BigDecimal valorBuffet, BigDecimal valorFinalContrato,
    BigDecimal valorVendaReal, BigDecimal custoVariavel, BigDecimal totalRecebido,
    boolean bartenderIncluido, String observacao,
    String cerimonialistaNome, String cerimonialistaTelefone,
    String organizadorNome, String organizadorTelefone,
    String djNome, String djTelefone
) {}