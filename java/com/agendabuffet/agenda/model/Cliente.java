package com.agendabuffet.agenda.model;

import jakarta.persistence.*;

@Entity
@Table(name = "cliente")
public class Cliente {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public String nome;
    public String sobrenome;
    public String email;
    public String telefone1;
    public String telefone2;
}
