package com.agendabuffet.agenda.repository;

import com.agendabuffet.agenda.model.TipoEvento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TipoEventoRepository extends JpaRepository<TipoEvento, Long> {
    Optional<TipoEvento> findByNomeIgnoreCase(String nome);
}