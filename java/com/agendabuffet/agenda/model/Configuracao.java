package com.agendabuffet.agenda.model;

import jakarta.persistence.*;

@Entity
@Table(name = "configuracao")
public class Configuracao {
    @Id
    public String chave;

    @Column(columnDefinition = "TEXT")
    public String valor;
}