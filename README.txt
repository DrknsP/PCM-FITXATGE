PROJECTE CONNECTAT A SUPABASE

Aquest paquet ja porta configurada la URL i la clau publica del projecte Supabase. No hi ha cap clau secreta dins del projecte.

PCM FRUITS · FITXATGE

1. Executa supabase-setup.sql a Supabase (si ja ho has fet, no cal repetir-ho).
2. Obre app.js i posa:
   - SUPABASE_URL: URL del projecte (https://....supabase.co)
   - SUPABASE_ANON_KEY: clau pública sb_publishable_... (MAI sb_secret_...)
3. Crea l'administrador a Supabase > Authentication > Users.
4. Afegeix empleats a Table Editor > empleats.
5. Obre index.html amb Live Server o publica la carpeta a GitHub Pages.

NOVETATS DEL PANELL ADMIN:
- Buscador per nom o codi.
- Filtres per empleat, mes, dia i tipus.
- Exportació CSV dels registres filtrats.
- Exportació d'un resum diari per empleat amb primera entrada, última sortida i hores emparellades.
- Llista separable d'empleats actius i inactius.

NOVA GESTIO D'EMPLEATS
----------------------
1. A Supabase, obre SQL Editor.
2. Executa el fitxer ACTUALITZACIO-SUPABASE.sql una sola vegada.
3. Entra a l'admin de l'app.
4. Des de Gestio d'empleats podras crear, editar, activar i desactivar empleats.

No s'eliminen empleats per conservar l'historial. Quan un treballador marxa, desactiva'l.


NOVETATS V4
- En seleccionar un empleat al filtre de fitxatges, es mostra el total d'hores del mes.
- Calendari mensual amb els dies que tenen fitxatges marcats.
- Taula diària amb primera entrada, última sortida, hores calculades i nombre de fitxatges.
- No cal executar cap SQL nou.


IMPORTAR ELS 54 TREBALLADORS
----------------------------
1. Ves a Supabase > SQL Editor > New query.
2. Obre el fitxer IMPORTAR-TREBALLADORS-1-A-54.sql.
3. Copia tot el contingut, enganxa'l i prem Run.
4. Es crearan o actualitzaran els treballadors amb codis consecutius de l'1 al 54.
5. Tots quedaran marcats com a actius. Des de l'admin pots desactivar els que no treballin.

NOVETAT V6
- La gestió d'empleats incorpora un selector per ordenar per ID ascendent o descendent, o per nom.
