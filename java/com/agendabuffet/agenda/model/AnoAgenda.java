package com.agendabuffet.agenda.model;

import jakarta.persistence.*;

@Entity
@Table(name = "ano_agenda")
public class AnoAgenda {
    @Id
    public Integer ano;

    public AnoAgenda() {}
    public AnoAgenda(Integer ano) { this.ano = ano; }
}
