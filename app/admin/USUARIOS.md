# Usuários administrativos

Gerenciamento em `/admin/usuarios`, usando sessão, scrypt e auditoria existentes. OWNER/ADMIN acessam a lista. Somente OWNER pode criar ou modificar OWNER. ADMIN gerencia contas ADMIN/MARKETING/SALES/VIEWER.

- `GET /api/admin/usuarios?page=1`: lista paginada, sem hash.
- `POST /api/admin/usuarios`: criação com nome, e-mail, role, active, password e confirm_password.
- `PATCH /api/admin/usuarios/{id}`: somente nome/e-mail/role/active; rejeita campos de senha.
- `POST /api/admin/usuarios/{id}/password`: password e confirm_password; revoga todas as sessões.
- `POST /api/admin/usuarios/{id}/status`: active booleano; desativação revoga sessões.
- `POST /api/admin/usuarios/{id}/delete`: corpo `{}`; exclusão lógica, sem destruir referências e auditoria.

E-mail é normalizado e protegido por índice único `lower(email)`. Senhas exigem 12 caracteres, até 256 bytes, confirmação idêntica e usam o mesmo `hashPassword()` scrypt do login. Nenhuma senha/hash vai à resposta ou à auditoria.

Migração 8 adiciona `users.name`, `users.created_at`, `users.deleted_at`. Datas antigas desconhecidas permanecem NULL. Novos registros recebem a data automaticamente, inclusive pelo provisionamento existente. Se houver duplicatas históricas de e-mail diferenciadas apenas por maiúsculas, o índice recusa a migração, sem apagar ou mesclar usuários silenciosamente.

Exclusão marca `active=0` e `deleted_at`, mantendo e-mail reservado e histórico visível como Excluído. A ativação comum não restaura contas excluídas. Para suspensões reversíveis, usar Desativar/Ativar.

Verificações são transacionais, reutilizando o lock PostgreSQL existente. A role e atividade do operador são relidas do banco dentro da transação. Não é possível desativar/excluir/rebaixar a própria conta, nem remover o último OWNER ativo. Mudanças de e-mail, role, status e senha revogam sessões; editar apenas nome não revoga. Alterar o próprio e-mail/senha solicita novo login.

Auditoria: `user_created`, `user_updated`, `user_role_changed`, `user_activated`, `user_deactivated`, `user_password_reset`, `user_deleted`. Registra operador, instante e ID do alvo; nunca credenciais.

Testes: `scripts/users.test.mjs` (PostgreSQL isolado via PGlite, sem ambiente real) e `scripts/users-ui.test.cjs` (renderização dos componentes). Não foram modificados usuários ou aplicadas migrações na produção.
