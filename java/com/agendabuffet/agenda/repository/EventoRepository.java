package com.agendabuffet.agenda.repository;

import com.agendabuffet.agenda.model.Evento;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;

public interface EventoRepository extends JpaRepository<Evento, Long> {

    // eventos de um período (usado pelo calendário, mês a mês)
    List<Evento> findByDataEventoBetweenOrderByDataEventoAscHoraInicioAsc(LocalDate inicio, LocalDate fim);

    // de hoje em diante, do mais próximo para o mais distante (máximo de 300)
    List<Evento> findTop300ByDataEventoGreaterThanEqualOrderByDataEventoAscHoraInicioAsc(LocalDate data);

    // antes de hoje, do mais recente para o mais antigo (máximo de 300)
    List<Evento> findTop300ByDataEventoLessThanOrderByDataEventoDescHoraInicioDesc(LocalDate data);

    long countByTipoEventoId(Long tipoId);

    @Query("select e.tipoEvento.id, count(e) from Evento e group by e.tipoEvento.id")
    List<Object[]> contarPorTipo();
}