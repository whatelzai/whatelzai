-- Release-phase gate: apply after the replacement API is live.
-- Old immutable deployments/cached anonymous forms must not bypass registered-email verification.
revoke execute on function public.submit_event_feedback(uuid,uuid,integer,text,text) from service_role;
alter table public.event_feedback_forms add constraint event_feedback_ten_question_cap check(jsonb_array_length(questions)<=10);
