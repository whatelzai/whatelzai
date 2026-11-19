begin;
-- Owner-authorized current-form revision; immutable historical form rows and responses remain intact.
-- Activate only after a deployment supporting single_select and optional standalone comments is READY.
alter table public.event_feedback_form_bindings disable trigger event_feedback_binding_immutable;
update public.event_feedback_form_bindings set form_id='feedback-v4-20261119' where form_id='feedback-v3-20261118';
alter table public.event_feedback_form_bindings enable trigger event_feedback_binding_immutable;
commit;
