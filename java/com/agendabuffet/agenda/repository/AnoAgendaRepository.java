package com.agendabuffet.agenda.repository;

import com.agendabuffet.agenda.model.AnoAgenda;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AnoAgendaRepository extends JpaRepository<AnoAgenda, Integer> {
    List<AnoAgenda> findAllByOrderByAnoAsc();
}
