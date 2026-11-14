-- Original Aurion catalogue exported from Aurion_Data.sql.
-- Loaded once on a fresh Docker volume; never truncates existing data.
BEGIN;

COPY public.vehicles (id, model, brand, price, vehicle_type, variant) FROM stdin;
84	Scorpio N	Mahindra	1600000	SUV	V
85	Scorpio N	Mahindra	1650000	SUV	VX
86	Scorpio N	Mahindra	1700000	SUV	ZX
87	Scorpio N	Mahindra	1750000	SUV	Sport
88	Scorpio N	Mahindra	1800000	SUV	Premium
89	Scorpio N	Mahindra	1850000	SUV	Limited
90	Scorpio N	Mahindra	1900000	SUV	Signature
91	Thar	Mahindra	1200000	SUV	Base
92	Thar	Mahindra	1250000	SUV	S
93	Thar	Mahindra	1300000	SUV	S Plus
94	Thar	Mahindra	1350000	SUV	V
95	Thar	Mahindra	1400000	SUV	VX
96	Thar	Mahindra	1450000	SUV	ZX
97	Thar	Mahindra	1500000	SUV	Sport
98	Thar	Mahindra	1550000	SUV	Premium
99	Thar	Mahindra	1600000	SUV	Limited
100	Thar	Mahindra	1650000	SUV	Signature
101	XUV 3XO	Mahindra	950000	SUV	Base
102	XUV 3XO	Mahindra	1000000	SUV	S
103	XUV 3XO	Mahindra	1050000	SUV	S Plus
104	XUV 3XO	Mahindra	1100000	SUV	V
105	XUV 3XO	Mahindra	1150000	SUV	VX
106	XUV 3XO	Mahindra	1200000	SUV	ZX
107	XUV 3XO	Mahindra	1250000	SUV	Sport
108	XUV 3XO	Mahindra	1300000	SUV	Premium
109	XUV 3XO	Mahindra	1350000	SUV	Limited
110	XUV 3XO	Mahindra	1400000	SUV	Signature
111	Baleno	Maruti Suzuki	700000	Hatchback	Base
112	Baleno	Maruti Suzuki	750000	Hatchback	S
113	Baleno	Maruti Suzuki	800000	Hatchback	S Plus
114	Baleno	Maruti Suzuki	850000	Hatchback	V
115	Baleno	Maruti Suzuki	900000	Hatchback	VX
116	Baleno	Maruti Suzuki	950000	Hatchback	ZX
117	Baleno	Maruti Suzuki	1000000	Hatchback	Sport
118	Baleno	Maruti Suzuki	1050000	Hatchback	Premium
119	Baleno	Maruti Suzuki	1100000	Hatchback	Limited
120	Baleno	Maruti Suzuki	1150000	Hatchback	Signature
121	Brezza	Maruti Suzuki	900000	SUV	Base
122	Brezza	Maruti Suzuki	950000	SUV	S
123	Brezza	Maruti Suzuki	1000000	SUV	S Plus
124	Brezza	Maruti Suzuki	1050000	SUV	V
125	Brezza	Maruti Suzuki	1100000	SUV	VX
126	Brezza	Maruti Suzuki	1150000	SUV	ZX
127	Brezza	Maruti Suzuki	1200000	SUV	Sport
128	Brezza	Maruti Suzuki	1250000	SUV	Premium
129	Brezza	Maruti Suzuki	1300000	SUV	Limited
130	Brezza	Maruti Suzuki	1350000	SUV	Signature
131	Swift	Maruti Suzuki	650000	Hatchback	Base
132	Swift	Maruti Suzuki	700000	Hatchback	S
133	Swift	Maruti Suzuki	750000	Hatchback	S Plus
134	Swift	Maruti Suzuki	800000	Hatchback	V
135	Swift	Maruti Suzuki	850000	Hatchback	VX
136	Swift	Maruti Suzuki	900000	Hatchback	ZX
137	Swift	Maruti Suzuki	950000	Hatchback	Sport
138	Swift	Maruti Suzuki	1000000	Hatchback	Premium
139	Swift	Maruti Suzuki	1050000	Hatchback	Limited
140	Swift	Maruti Suzuki	1100000	Hatchback	Signature
141	Harrier	Tata	1500000	SUV	Base
142	Harrier	Tata	1550000	SUV	S
143	Harrier	Tata	1600000	SUV	S Plus
144	Harrier	Tata	1650000	SUV	V
145	Harrier	Tata	1700000	SUV	VX
146	Harrier	Tata	1750000	SUV	ZX
147	Harrier	Tata	1800000	SUV	Sport
148	Harrier	Tata	1850000	SUV	Premium
149	Harrier	Tata	1900000	SUV	Limited
150	Harrier	Tata	1950000	SUV	Signature
151	Nexon	Tata	850000	SUV	Base
152	Nexon	Tata	900000	SUV	S
153	Nexon	Tata	950000	SUV	S Plus
154	Nexon	Tata	1000000	SUV	V
1	Amaze	Honda	800000	Sedan	Base
2	Amaze	Honda	850000	Sedan	S
3	Amaze	Honda	900000	Sedan	S Plus
4	Amaze	Honda	950000	Sedan	V
5	Amaze	Honda	1000000	Sedan	VX
6	Amaze	Honda	1050000	Sedan	ZX
7	Amaze	Honda	1100000	Sedan	Sport
8	Amaze	Honda	1150000	Sedan	Premium
9	Amaze	Honda	1200000	Sedan	Limited
10	Amaze	Honda	1250000	Sedan	Signature
11	City	Honda	1150000	Sedan	Base
12	City	Honda	1200000	Sedan	S
13	City	Honda	1250000	Sedan	S Plus
14	City	Honda	1300000	Sedan	V
15	City	Honda	1350000	Sedan	VX
16	City	Honda	1400000	Sedan	ZX
17	City	Honda	1450000	Sedan	Sport
18	City	Honda	1500000	Sedan	Premium
19	City	Honda	1550000	Sedan	Limited
20	City	Honda	1600000	Sedan	Signature
21	Elevate	Honda	1250000	SUV	Base
22	Elevate	Honda	1300000	SUV	S
23	Elevate	Honda	1350000	SUV	S Plus
24	Elevate	Honda	1400000	SUV	V
25	Elevate	Honda	1450000	SUV	VX
26	Elevate	Honda	1500000	SUV	ZX
27	Elevate	Honda	1550000	SUV	Sport
28	Elevate	Honda	1600000	SUV	Premium
29	Elevate	Honda	1650000	SUV	Limited
30	Elevate	Honda	1700000	SUV	Signature
31	Creta	Hyundai	1150000	SUV	Base
32	Creta	Hyundai	1200000	SUV	S
33	Creta	Hyundai	1250000	SUV	S Plus
34	Creta	Hyundai	1300000	SUV	V
35	Creta	Hyundai	1350000	SUV	VX
36	Creta	Hyundai	1400000	SUV	ZX
37	Creta	Hyundai	1450000	SUV	Sport
38	Creta	Hyundai	1500000	SUV	Premium
39	Creta	Hyundai	1550000	SUV	Limited
40	Creta	Hyundai	1600000	SUV	Signature
41	i20	Hyundai	730000	Hatchback	Base
42	i20	Hyundai	780000	Hatchback	S
43	i20	Hyundai	830000	Hatchback	S Plus
44	i20	Hyundai	880000	Hatchback	V
45	i20	Hyundai	930000	Hatchback	VX
46	i20	Hyundai	980000	Hatchback	ZX
47	i20	Hyundai	1030000	Hatchback	Sport
48	i20	Hyundai	1080000	Hatchback	Premium
49	i20	Hyundai	1130000	Hatchback	Limited
50	i20	Hyundai	1180000	Hatchback	Signature
51	Verna	Hyundai	1100000	Sedan	Base
52	Verna	Hyundai	1150000	Sedan	S
53	Verna	Hyundai	1200000	Sedan	S Plus
54	Verna	Hyundai	1250000	Sedan	V
55	Verna	Hyundai	1300000	Sedan	VX
56	Verna	Hyundai	1350000	Sedan	ZX
57	Verna	Hyundai	1400000	Sedan	Sport
58	Verna	Hyundai	1450000	Sedan	Premium
59	Verna	Hyundai	1500000	Sedan	Limited
60	Verna	Hyundai	1550000	Sedan	Signature
61	Seltos	Kia	1150000	SUV	Base
62	Seltos	Kia	1200000	SUV	S
63	Seltos	Kia	1250000	SUV	S Plus
64	Seltos	Kia	1300000	SUV	V
65	Seltos	Kia	1350000	SUV	VX
66	Seltos	Kia	1400000	SUV	ZX
67	Seltos	Kia	1450000	SUV	Sport
68	Seltos	Kia	1500000	SUV	Premium
69	Seltos	Kia	1550000	SUV	Limited
70	Seltos	Kia	1600000	SUV	Signature
71	Sonet	Kia	850000	SUV	Base
72	Sonet	Kia	900000	SUV	S
73	Sonet	Kia	950000	SUV	S Plus
74	Sonet	Kia	1000000	SUV	V
75	Sonet	Kia	1050000	SUV	VX
76	Sonet	Kia	1100000	SUV	ZX
77	Sonet	Kia	1150000	SUV	Sport
78	Sonet	Kia	1200000	SUV	Premium
79	Sonet	Kia	1250000	SUV	Limited
80	Sonet	Kia	1300000	SUV	Signature
81	Scorpio N	Mahindra	1450000	SUV	Base
82	Scorpio N	Mahindra	1500000	SUV	S
83	Scorpio N	Mahindra	1550000	SUV	S Plus
155	Nexon	Tata	1050000	SUV	VX
156	Nexon	Tata	1100000	SUV	ZX
157	Nexon	Tata	1150000	SUV	Sport
158	Nexon	Tata	1200000	SUV	Premium
159	Nexon	Tata	1250000	SUV	Limited
160	Nexon	Tata	1300000	SUV	Signature
161	Tiago	Tata	600000	Hatchback	Base
162	Tiago	Tata	650000	Hatchback	S
163	Tiago	Tata	700000	Hatchback	S Plus
164	Tiago	Tata	750000	Hatchback	V
165	Tiago	Tata	800000	Hatchback	VX
166	Tiago	Tata	850000	Hatchback	ZX
167	Tiago	Tata	900000	Hatchback	Sport
168	Tiago	Tata	950000	Hatchback	Premium
169	Tiago	Tata	1000000	Hatchback	Limited
170	Tiago	Tata	1050000	Hatchback	Signature
171	Fortuner	Toyota	3400000	SUV	Base
172	Fortuner	Toyota	3450000	SUV	S
173	Fortuner	Toyota	3500000	SUV	S Plus
174	Fortuner	Toyota	3550000	SUV	V
175	Fortuner	Toyota	3600000	SUV	VX
176	Fortuner	Toyota	3650000	SUV	ZX
177	Fortuner	Toyota	3700000	SUV	Sport
178	Fortuner	Toyota	3750000	SUV	Premium
179	Fortuner	Toyota	3800000	SUV	Limited
180	Fortuner	Toyota	3850000	SUV	Signature
181	Glanza	Toyota	750000	Hatchback	Base
182	Glanza	Toyota	800000	Hatchback	S
183	Glanza	Toyota	850000	Hatchback	S Plus
184	Glanza	Toyota	900000	Hatchback	V
185	Glanza	Toyota	950000	Hatchback	VX
186	Glanza	Toyota	1000000	Hatchback	ZX
187	Glanza	Toyota	1050000	Hatchback	Sport
188	Glanza	Toyota	1100000	Hatchback	Premium
189	Glanza	Toyota	1150000	Hatchback	Limited
190	Glanza	Toyota	1200000	Hatchback	Signature
191	Urban Cruiser Hyryder	Toyota	1200000	SUV	Base
192	Urban Cruiser Hyryder	Toyota	1250000	SUV	S
193	Urban Cruiser Hyryder	Toyota	1300000	SUV	S Plus
194	Urban Cruiser Hyryder	Toyota	1350000	SUV	V
195	Urban Cruiser Hyryder	Toyota	1400000	SUV	VX
196	Urban Cruiser Hyryder	Toyota	1450000	SUV	ZX
197	Urban Cruiser Hyryder	Toyota	1500000	SUV	Sport
198	Urban Cruiser Hyryder	Toyota	1550000	SUV	Premium
199	Urban Cruiser Hyryder	Toyota	1600000	SUV	Limited
200	Urban Cruiser Hyryder	Toyota	1650000	SUV	Signature
\.

COPY public.vehicles_backup (id, model, brand, price, vehicle_type, variant) FROM stdin;
42	i20	Hyundai	780000	Hatchback	S
43	i20	Hyundai	830000	Hatchback	S Plus
44	i20	Hyundai	880000	Hatchback	V
45	i20	Hyundai	930000	Hatchback	VX
46	i20	Hyundai	980000	Hatchback	ZX
47	i20	Hyundai	1030000	Hatchback	Sport
48	i20	Hyundai	1080000	Hatchback	Premium
49	i20	Hyundai	1130000	Hatchback	Limited
50	i20	Hyundai	1180000	Hatchback	Signature
51	Verna	Hyundai	1100000	Sedan	Base
52	Verna	Hyundai	1150000	Sedan	S
53	Verna	Hyundai	1200000	Sedan	S Plus
54	Verna	Hyundai	1250000	Sedan	V
55	Verna	Hyundai	1300000	Sedan	VX
56	Verna	Hyundai	1350000	Sedan	ZX
57	Verna	Hyundai	1400000	Sedan	Sport
58	Verna	Hyundai	1450000	Sedan	Premium
59	Verna	Hyundai	1500000	Sedan	Limited
60	Verna	Hyundai	1550000	Sedan	Signature
61	Seltos	Kia	1150000	SUV	Base
62	Seltos	Kia	1200000	SUV	S
63	Seltos	Kia	1250000	SUV	S Plus
64	Seltos	Kia	1300000	SUV	V
65	Seltos	Kia	1350000	SUV	VX
66	Seltos	Kia	1400000	SUV	ZX
67	Seltos	Kia	1450000	SUV	Sport
68	Seltos	Kia	1500000	SUV	Premium
69	Seltos	Kia	1550000	SUV	Limited
70	Seltos	Kia	1600000	SUV	Signature
71	Sonet	Kia	850000	SUV	Base
72	Sonet	Kia	900000	SUV	S
73	Sonet	Kia	950000	SUV	S Plus
74	Sonet	Kia	1000000	SUV	V
75	Sonet	Kia	1050000	SUV	VX
76	Sonet	Kia	1100000	SUV	ZX
77	Sonet	Kia	1150000	SUV	Sport
78	Sonet	Kia	1200000	SUV	Premium
79	Sonet	Kia	1250000	SUV	Limited
80	Sonet	Kia	1300000	SUV	Signature
81	Scorpio N	Mahindra	1450000	SUV	Base
82	Scorpio N	Mahindra	1500000	SUV	S
83	Scorpio N	Mahindra	1550000	SUV	S Plus
84	Scorpio N	Mahindra	1600000	SUV	V
85	Scorpio N	Mahindra	1650000	SUV	VX
86	Scorpio N	Mahindra	1700000	SUV	ZX
87	Scorpio N	Mahindra	1750000	SUV	Sport
88	Scorpio N	Mahindra	1800000	SUV	Premium
89	Scorpio N	Mahindra	1850000	SUV	Limited
90	Scorpio N	Mahindra	1900000	SUV	Signature
91	Thar	Mahindra	1200000	SUV	Base
92	Thar	Mahindra	1250000	SUV	S
93	Thar	Mahindra	1300000	SUV	S Plus
94	Thar	Mahindra	1350000	SUV	V
95	Thar	Mahindra	1400000	SUV	VX
96	Thar	Mahindra	1450000	SUV	ZX
97	Thar	Mahindra	1500000	SUV	Sport
98	Thar	Mahindra	1550000	SUV	Premium
99	Thar	Mahindra	1600000	SUV	Limited
100	Thar	Mahindra	1650000	SUV	Signature
101	XUV 3XO	Mahindra	950000	SUV	Base
102	XUV 3XO	Mahindra	1000000	SUV	S
103	XUV 3XO	Mahindra	1050000	SUV	S Plus
104	XUV 3XO	Mahindra	1100000	SUV	V
105	XUV 3XO	Mahindra	1150000	SUV	VX
106	XUV 3XO	Mahindra	1200000	SUV	ZX
107	XUV 3XO	Mahindra	1250000	SUV	Sport
108	XUV 3XO	Mahindra	1300000	SUV	Premium
109	XUV 3XO	Mahindra	1350000	SUV	Limited
110	XUV 3XO	Mahindra	1400000	SUV	Signature
111	Baleno	Maruti Suzuki	700000	Hatchback	Base
112	Baleno	Maruti Suzuki	750000	Hatchback	S
113	Baleno	Maruti Suzuki	800000	Hatchback	S Plus
114	Baleno	Maruti Suzuki	850000	Hatchback	V
115	Baleno	Maruti Suzuki	900000	Hatchback	VX
116	Baleno	Maruti Suzuki	950000	Hatchback	ZX
117	Baleno	Maruti Suzuki	1000000	Hatchback	Sport
118	Baleno	Maruti Suzuki	1050000	Hatchback	Premium
119	Baleno	Maruti Suzuki	1100000	Hatchback	Limited
120	Baleno	Maruti Suzuki	1150000	Hatchback	Signature
121	Brezza	Maruti Suzuki	900000	SUV	Base
122	Brezza	Maruti Suzuki	950000	SUV	S
123	Brezza	Maruti Suzuki	1000000	SUV	S Plus
124	Brezza	Maruti Suzuki	1050000	SUV	V
125	Brezza	Maruti Suzuki	1100000	SUV	VX
126	Brezza	Maruti Suzuki	1150000	SUV	ZX
127	Brezza	Maruti Suzuki	1200000	SUV	Sport
128	Brezza	Maruti Suzuki	1250000	SUV	Premium
129	Brezza	Maruti Suzuki	1300000	SUV	Limited
130	Brezza	Maruti Suzuki	1350000	SUV	Signature
131	Swift	Maruti Suzuki	650000	Hatchback	Base
132	Swift	Maruti Suzuki	700000	Hatchback	S
133	Swift	Maruti Suzuki	750000	Hatchback	S Plus
134	Swift	Maruti Suzuki	800000	Hatchback	V
135	Swift	Maruti Suzuki	850000	Hatchback	VX
136	Swift	Maruti Suzuki	900000	Hatchback	ZX
137	Swift	Maruti Suzuki	950000	Hatchback	Sport
138	Swift	Maruti Suzuki	1000000	Hatchback	Premium
139	Swift	Maruti Suzuki	1050000	Hatchback	Limited
140	Swift	Maruti Suzuki	1100000	Hatchback	Signature
141	Harrier	Tata	1500000	SUV	Base
142	Harrier	Tata	1550000	SUV	S
143	Harrier	Tata	1600000	SUV	S Plus
144	Harrier	Tata	1650000	SUV	V
145	Harrier	Tata	1700000	SUV	VX
146	Harrier	Tata	1750000	SUV	ZX
147	Harrier	Tata	1800000	SUV	Sport
148	Harrier	Tata	1850000	SUV	Premium
149	Harrier	Tata	1900000	SUV	Limited
150	Harrier	Tata	1950000	SUV	Signature
151	Nexon	Tata	850000	SUV	Base
152	Nexon	Tata	900000	SUV	S
153	Nexon	Tata	950000	SUV	S Plus
154	Nexon	Tata	1000000	SUV	V
1	Amaze	Honda	800000	Sedan	Base
2	Amaze	Honda	850000	Sedan	S
3	Amaze	Honda	900000	Sedan	S Plus
4	Amaze	Honda	950000	Sedan	V
5	Amaze	Honda	1000000	Sedan	VX
6	Amaze	Honda	1050000	Sedan	ZX
7	Amaze	Honda	1100000	Sedan	Sport
8	Amaze	Honda	1150000	Sedan	Premium
9	Amaze	Honda	1200000	Sedan	Limited
10	Amaze	Honda	1250000	Sedan	Signature
11	City	Honda	1150000	Sedan	Base
12	City	Honda	1200000	Sedan	S
13	City	Honda	1250000	Sedan	S Plus
14	City	Honda	1300000	Sedan	V
15	City	Honda	1350000	Sedan	VX
16	City	Honda	1400000	Sedan	ZX
17	City	Honda	1450000	Sedan	Sport
18	City	Honda	1500000	Sedan	Premium
19	City	Honda	1550000	Sedan	Limited
20	City	Honda	1600000	Sedan	Signature
21	Elevate	Honda	1250000	SUV	Base
22	Elevate	Honda	1300000	SUV	S
23	Elevate	Honda	1350000	SUV	S Plus
24	Elevate	Honda	1400000	SUV	V
25	Elevate	Honda	1450000	SUV	VX
26	Elevate	Honda	1500000	SUV	ZX
27	Elevate	Honda	1550000	SUV	Sport
28	Elevate	Honda	1600000	SUV	Premium
29	Elevate	Honda	1650000	SUV	Limited
30	Elevate	Honda	1700000	SUV	Signature
31	Creta	Hyundai	1150000	SUV	Base
32	Creta	Hyundai	1200000	SUV	S
33	Creta	Hyundai	1250000	SUV	S Plus
34	Creta	Hyundai	1300000	SUV	V
35	Creta	Hyundai	1350000	SUV	VX
36	Creta	Hyundai	1400000	SUV	ZX
37	Creta	Hyundai	1450000	SUV	Sport
38	Creta	Hyundai	1500000	SUV	Premium
39	Creta	Hyundai	1550000	SUV	Limited
40	Creta	Hyundai	1600000	SUV	Signature
41	i20	Hyundai	730000	Hatchback	Base
155	Nexon	Tata	1050000	SUV	VX
156	Nexon	Tata	1100000	SUV	ZX
157	Nexon	Tata	1150000	SUV	Sport
158	Nexon	Tata	1200000	SUV	Premium
159	Nexon	Tata	1250000	SUV	Limited
160	Nexon	Tata	1300000	SUV	Signature
161	Tiago	Tata	600000	Hatchback	Base
162	Tiago	Tata	650000	Hatchback	S
163	Tiago	Tata	700000	Hatchback	S Plus
164	Tiago	Tata	750000	Hatchback	V
165	Tiago	Tata	800000	Hatchback	VX
166	Tiago	Tata	850000	Hatchback	ZX
167	Tiago	Tata	900000	Hatchback	Sport
168	Tiago	Tata	950000	Hatchback	Premium
169	Tiago	Tata	1000000	Hatchback	Limited
170	Tiago	Tata	1050000	Hatchback	Signature
171	Fortuner	Toyota	3400000	SUV	Base
172	Fortuner	Toyota	3450000	SUV	S
173	Fortuner	Toyota	3500000	SUV	S Plus
174	Fortuner	Toyota	3550000	SUV	V
175	Fortuner	Toyota	3600000	SUV	VX
176	Fortuner	Toyota	3650000	SUV	ZX
177	Fortuner	Toyota	3700000	SUV	Sport
178	Fortuner	Toyota	3750000	SUV	Premium
179	Fortuner	Toyota	3800000	SUV	Limited
180	Fortuner	Toyota	3850000	SUV	Signature
181	Glanza	Toyota	750000	Hatchback	Base
182	Glanza	Toyota	800000	Hatchback	S
183	Glanza	Toyota	850000	Hatchback	S Plus
184	Glanza	Toyota	900000	Hatchback	V
185	Glanza	Toyota	950000	Hatchback	VX
186	Glanza	Toyota	1000000	Hatchback	ZX
187	Glanza	Toyota	1050000	Hatchback	Sport
188	Glanza	Toyota	1100000	Hatchback	Premium
189	Glanza	Toyota	1150000	Hatchback	Limited
190	Glanza	Toyota	1200000	Hatchback	Signature
191	Urban Cruiser Hyryder	Toyota	1200000	SUV	Base
192	Urban Cruiser Hyryder	Toyota	1250000	SUV	S
193	Urban Cruiser Hyryder	Toyota	1300000	SUV	S Plus
194	Urban Cruiser Hyryder	Toyota	1350000	SUV	V
195	Urban Cruiser Hyryder	Toyota	1400000	SUV	VX
196	Urban Cruiser Hyryder	Toyota	1450000	SUV	ZX
197	Urban Cruiser Hyryder	Toyota	1500000	SUV	Sport
198	Urban Cruiser Hyryder	Toyota	1550000	SUV	Premium
199	Urban Cruiser Hyryder	Toyota	1600000	SUV	Limited
200	Urban Cruiser Hyryder	Toyota	1650000	SUV	Signature
\.

SELECT pg_catalog.setval('public.vehicles_id_seq', 200, true);
COMMIT;
