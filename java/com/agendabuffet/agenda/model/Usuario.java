package com.agendabuffet.agenda.model;

import jakarta.persistence.*;

@Entity
@Table(name = "usuario")
public class Usuario {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    public Long id;
    public String nome;
    public String email;
    public String senhaHash;
    public String perfil;   // ADMIN ou RESTRITO
}
