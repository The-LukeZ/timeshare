alter table timestamps
  add column creator_timezone text not null default 'UTC';
