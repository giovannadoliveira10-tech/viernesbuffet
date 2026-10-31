package com.agendabuffet.agenda.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDate;

@Entity
@Table(name = "pagamento")
public class Pagamento {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    @JsonIgnore
    @ManyToOne @JoinColumn(name = "evento_id", nullable = false)
    public Evento evento;

    public LocalDate data;

    @Column(precision = 10, scale = 2)
    public BigDecimal valor;

    public String forma;        // PIX, CARTAO, DINHEIRO, TRANSFERENCIA ou OUTRO
    public String observacao;
}
