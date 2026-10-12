# 🥭 Mamey Planner

Una app de nutrición y recomposición corporal **gratuita, sin anuncios y sin límites artificiales** — pensada para que cualquier persona, sin importar su presupuesto, pueda tener mejores hábitos alimenticios y avanzar hacia su objetivo físico.

## Misión

Ayudar a las personas a construir mejores hábitos alimenticios y alcanzar su recomposición corporal u objetivos físicos, eliminando las barreras de costo, complejidad y publicidad que imponen las apps de nutrición comerciales.

## Visión

Ser la alternativa gratuita y de código abierto más completa frente a apps como Foodvisor, Cal AI o MyFitnessPal — disponible para cualquier dispositivo, con una base de datos nutricional abierta y verificada, y sin que el usuario tenga que pagar ni ver un solo anuncio para acceder a funciones completas.

## Objetivo

- **Corto plazo:** v1 estable como web app, funcional en cualquier navegador/dispositivo.
- **Mediano plazo:** liberar el proyecto como **código abierto** una vez esté estable, para que cualquiera pueda usarlo, auditarlo o mejorarlo.
- **Largo plazo:** apps nativas (iOS/Android) con integración a HealthKit/Health Connect.

## Filosofía

- **Gratis es gratis.** Sin "3 escaneos al día y luego paga". Todo lo que la app ofrece, lo ofrece completo.
- **Sin anuncios**, nunca.
- **Datos abiertos y verificados** — base de datos nutricional de Open Food Facts/USDA, no crowdsourced sin control.
- **Privacidad primero** — si usas IA para fotos, tú traes tu propia API key (BYOK); tus datos nunca pasan por un proveedor que no elegiste tú mismo.
- **Multiplataforma real** — web ahora, nativo después, sin dejar a nadie fuera por el sistema operativo que use.

## Funcionalidades

- Registro de comidas por **búsqueda**, **voz**, **código de barras**, **foto con IA** (proveedor a tu elección) o **importación de receta por URL**.
- Alimentos personalizados cuando no se encuentra algo en la base de datos.
- Cálculo automático de calorías y macros según tu objetivo (bajar grasa, ganar músculo, recomposición, mantener) usando TDEE real (Mifflin-St Jeor).
- Seguimiento de peso, % de grasa y cintura, con gráfica de progreso.
- Rachas de hábito (streaks) para reforzar la constancia.
- Dashboard con navegación por día (no solo "hoy").
- Micronutrientes (fibra, azúcar, sodio, vitaminas, minerales) cuando la fuente de datos los reporta.
- Recuperación de cuenta sin depender de un servidor de correo (código de recuperación de un solo uso).
- Exportación completa de tus propios datos en cualquier momento.
- Onboarding guiado paso a paso para quien no sabe nada de nutrición ni de tecnología.

## Estado del proyecto

🚧 **En desarrollo activo.** Corre como app web local (Docker). Aún no es público ni de código abierto — eso llega cuando la v1 esté estable.

## Cómo correrlo localmente

Requiere Docker.

```bash
git clone <este-repo>
cd mamey-planner
docker-compose up -d --build
```

- Web: http://localhost:3100
- API: http://localhost:4100/api

## Stack técnico

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Base de datos:** PostgreSQL
- **Datos nutricionales:** Open Food Facts (API abierta y gratuita)
- **IA de fotos (opcional):** Anthropic Claude / OpenAI / Google Gemini — a elección del usuario, con su propia API key
- **Infraestructura:** Docker Compose

## Roadmap pendiente

- [ ] Build de producción (actualmente corre en modo desarrollo)
- [ ] Apps nativas (iOS/Android) con HealthKit / Health Connect
- [ ] Liberación como código abierto
- [ ] Pruebas automatizadas

## Licencia

Por definir — el proyecto se liberará como código abierto cuando alcance una versión estable.
