-- ============================================================
-- Startup Radar — Seed Data (10 startups de ejemplo)
-- Ejecutar DESPUÉS de schema.sql
-- ============================================================

-- Insertamos las startups con UUIDs fijos para poder referenciarlas
-- desde pipeline_status y scores_history

insert into public.startups
  (id, name, sector, stage, location, description, funding, revenue,
   growth_rate, team_score, market_score, traction_score, capital_score,
   radar_score, founders, website, tags)
values
  (
    'a1000000-0000-0000-0000-000000000001',
    'NeuralFlow', 'AI/ML', 'Series A', 'San Francisco, USA',
    'Automatización inteligente de flujos de trabajo para equipos enterprise mediante agentes de IA.',
    8.50, '2.4M ARR', 340,
    88, 90, 85, 82, 87,
    'Sarah Chen, Marcus Webb',
    'https://neuralflow.ai',
    array['AI', 'Enterprise', 'SaaS', 'Automation']
  ),
  (
    'a1000000-0000-0000-0000-000000000002',
    'GreenStack', 'CleanTech', 'Seed', 'Berlin, Germany',
    'Plataforma de seguimiento y compensación de huella de carbono para empresas medianas.',
    2.10, '450K ARR', 180,
    75, 78, 68, 66, 72,
    'Lena Fischer, Tom Bauer',
    'https://greenstack.io',
    array['ESG', 'SaaS', 'B2B', 'Sustainability']
  ),
  (
    'a1000000-0000-0000-0000-000000000003',
    'MedPulse', 'HealthTech', 'Series B', 'London, UK',
    'Monitorización continua de pacientes crónicos con wearables y análisis predictivo.',
    24.00, '8.1M ARR', 210,
    93, 91, 89, 88, 91,
    'Dr. Priya Sharma, James O''Brien',
    'https://medpulse.health',
    array['HealthTech', 'IoT', 'Predictive', 'Wearables']
  ),
  (
    'a1000000-0000-0000-0000-000000000004',
    'FinLedger', 'FinTech', 'Pre-Seed', 'Madrid, Spain',
    'Contabilidad automatizada con IA para PYMEs, integrada con bancos y ERPs locales.',
    0.50, '120K ARR', 90,
    62, 65, 52, 50, 58,
    'Alejandro Ruiz, Marta López',
    'https://finledger.es',
    array['FinTech', 'SMB', 'Automation', 'Accounting']
  ),
  (
    'a1000000-0000-0000-0000-000000000005',
    'LogiSense', 'Logistics', 'Series A', 'Amsterdam, Netherlands',
    'Optimización de cadena de suministro en tiempo real con ML y visibilidad end-to-end.',
    11.00, '3.2M ARR', 155,
    81, 83, 77, 72, 79,
    'Pieter van Dam, Anke Brouwer',
    'https://logisense.com',
    array['Logistics', 'Supply Chain', 'ML', 'B2B']
  ),
  (
    'a1000000-0000-0000-0000-000000000006',
    'EdForge', 'EdTech', 'Seed', 'São Paulo, Brazil',
    'Aprendizaje personalizado adaptativo para educación K-12 con tutoría por IA.',
    3.20, '680K ARR', 220,
    68, 70, 60, 58, 64,
    'Lucas Ferreira, Ana Costa',
    'https://edforge.com.br',
    array['EdTech', 'K-12', 'AI Tutor', 'Adaptive Learning']
  ),
  (
    'a1000000-0000-0000-0000-000000000007',
    'CyberShield', 'Cybersecurity', 'Series A', 'Tel Aviv, Israel',
    'Detección y respuesta autónoma a amenazas cibernéticas para infraestructuras críticas.',
    15.00, '5.7M ARR', 290,
    86, 88, 80, 76, 83,
    'Noa Katz, Eyal Mizrahi',
    'https://cybershield.io',
    array['Cybersecurity', 'XDR', 'Enterprise', 'Critical Infrastructure']
  ),
  (
    'a1000000-0000-0000-0000-000000000008',
    'AgriBot', 'AgriTech', 'Seed', 'Buenos Aires, Argentina',
    'Drones autónomos de agricultura de precisión con análisis multispectral de cultivos.',
    1.80, '290K ARR', 130,
    64, 67, 58, 54, 61,
    'Martín Álvarez, Sofía Torres',
    'https://agribot.ag',
    array['AgriTech', 'Drones', 'Precision Farming', 'IoT']
  ),
  (
    'a1000000-0000-0000-0000-000000000009',
    'SpaceData', 'SpaceTech', 'Series B', 'Austin, USA',
    'Analítica de datos satelitales para sectores de seguros, finanzas y defensa.',
    40.00, '12M ARR', 175,
    95, 96, 92, 90, 94,
    'Dr. Emily Zhao, Robert Park',
    'https://spacedata.com',
    array['SpaceTech', 'Geospatial', 'B2B', 'Defense']
  ),
  (
    'a1000000-0000-0000-0000-000000000010',
    'RetailAI', 'RetailTech', 'Pre-Seed', 'Mexico City, Mexico',
    'Predicción de inventario y gestión dinámica de precios para retailers omnicanal.',
    0.30, '80K ARR', 70,
    52, 55, 44, 44, 49,
    'Diego Hernández, Valentina Cruz',
    'https://retailai.mx',
    array['Retail', 'AI', 'Pricing', 'Omnichannel']
  );

-- ============================================================
-- Pipeline status — fase actual de cada startup
-- ============================================================
insert into public.pipeline_status (startup_id, phase, notes) values
  ('a1000000-0000-0000-0000-000000000001', 'deepdive',      'Revisión técnica completada. Pendiente reunión con CTO.'),
  ('a1000000-0000-0000-0000-000000000002', 'screening',     'Modelo de negocio validado. Dudas sobre TAM europeo.'),
  ('a1000000-0000-0000-0000-000000000003', 'portfolio',     'Deal cerrado. Inversión de $5M en Serie B.'),
  ('a1000000-0000-0000-0000-000000000004', 'discovery',     'Referenciado por portfolio founder. Primera call pendiente.'),
  ('a1000000-0000-0000-0000-000000000005', 'outreach',      'Enviado term sheet preliminar. Esperando respuesta.'),
  ('a1000000-0000-0000-0000-000000000006', 'screening',     'Métricas de retención muy sólidas. Avanzar a deep dive.'),
  ('a1000000-0000-0000-0000-000000000007', 'duediligence',  'Due diligence legal y técnica en curso con Clifford Chance.'),
  ('a1000000-0000-0000-0000-000000000008', 'discovery',     'Encontrado en Y Combinator W24. Revisión inicial positiva.'),
  ('a1000000-0000-0000-0000-000000000009', 'ic',            'Presentación al comité el próximo jueves. Deck enviado.'),
  ('a1000000-0000-0000-0000-000000000010', 'discovery',     'Inbound desde LinkedIn. Pendiente de validar tracción.');

-- ============================================================
-- Scores history — snapshot inicial para cada startup
-- ============================================================
insert into public.scores_history
  (startup_id, radar_score, growth_score, team_score, market_score, traction_score, capital_score)
values
  ('a1000000-0000-0000-0000-000000000001', 87, 92, 88, 90, 85, 82),
  ('a1000000-0000-0000-0000-000000000002', 72, 75, 75, 78, 68, 66),
  ('a1000000-0000-0000-0000-000000000003', 91, 88, 93, 91, 89, 88),
  ('a1000000-0000-0000-0000-000000000004', 58, 55, 62, 65, 52, 50),
  ('a1000000-0000-0000-0000-000000000005', 79, 78, 81, 83, 77, 72),
  ('a1000000-0000-0000-0000-000000000006', 64, 70, 68, 70, 60, 58),
  ('a1000000-0000-0000-0000-000000000007', 83, 86, 86, 88, 80, 76),
  ('a1000000-0000-0000-0000-000000000008', 61, 62, 64, 67, 58, 54),
  ('a1000000-0000-0000-0000-000000000009', 94, 90, 95, 96, 92, 90),
  ('a1000000-0000-0000-0000-000000000010', 49, 48, 52, 55, 44, 44);
