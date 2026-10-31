package com.agendabuffet.agenda.repository;

import com.agendabuffet.agenda.model.Pagamento;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PagamentoRepository extends JpaRepository<Pagamento, Long> {
    List<Pagamento> findByEventoIdOrderByDataAscIdAsc(Long eventoId);
}
