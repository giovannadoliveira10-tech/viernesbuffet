package com.agendabuffet.agenda.model;

import jakarta.persistence.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "redefinicao_senha")
public class RedefinicaoSenha {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;

    public Long usuarioId;

    @Column(length = 64, unique = true)
    public String tokenHash;      // guardamos só o "resumo" do código, nunca o código em si

    public LocalDateTime expiraEm;

    public boolean usado;
}
