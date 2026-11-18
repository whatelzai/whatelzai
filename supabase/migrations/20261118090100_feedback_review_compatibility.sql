-- Keep the currently deployed form working while the replacement is under owner review.
-- Browser roles still have no execute permission. The replacement API will require verified email.
grant execute on function public.submit_event_feedback(uuid,uuid,integer,text,text) to service_role;
