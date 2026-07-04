CREATE VIEW question_accuracy AS
SELECT gr.assignment_id, ra.question_id,
       COUNT(*)              AS total_attempts,
       AVG(ra.correct::int)  AS accuracy_pct,
       AVG(ra.time_ms)       AS avg_time_ms
FROM result_answers ra
JOIN game_results gr ON ra.game_result_id = gr.id
GROUP BY gr.assignment_id, ra.question_id;
