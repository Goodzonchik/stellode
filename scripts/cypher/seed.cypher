// Seed exported from live Neo4j: units CoolUnit, CoolUnit2.
// IDs are stable and must not change after commit.
// Run via: npm run db:seed  or  npm run db:reset
// Note: CoolUnit Feature SendEmail has no FeatureVersion v1 (pruned before export).

CREATE (n:Unit {name: 'CoolUnit2', id: 'aae8e5d7-eb92-409a-8742-bf5394d12875', type: 'unit'});
CREATE (n:Unit {name: 'CoolUnit', id: 'b237b352-0299-4a8b-8bd2-d2826be958d5', type: 'unit'});
CREATE (n:Team {name: 'BackTeam', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '3a839b23-9e11-45e4-931a-dacbfc9f18e9', type: 'team'});
CREATE (n:Team {name: 'GatewayTeam', unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', id: '8a376cf5-db07-4ada-85eb-f00c6effae09', type: 'team'});
CREATE (n:Team {name: 'FrontTeam', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: 'cb569a93-f741-4168-81b5-dc8e33f30cc5', type: 'team'});
CREATE (n:Service {name: 'SendEmail', unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', id: '0ce504f2-176a-4000-a016-ba2692870120', type: 'service', status: 'active'});
CREATE (n:Service {name: 'Notifications', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '6868bc64-c032-423f-8730-413e55e28b13', type: 'service', status: 'active'});
CREATE (n:Feature {name: 'SendEmail', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '1ba63eec-5f38-461a-83a1-ea1c6b5d037a', type: 'feature'});
CREATE (n:Feature {name: 'SendNotificationInApp', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '80be4466-eb6b-4380-930a-bc26bf1eec20', type: 'feature'});
CREATE (n:Feature {name: 'SendEmail', unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', id: 'f34c4159-9f08-47a2-9974-0cf5a21a5b26', type: 'feature'});
CREATE (n:Application {name: 'EmailGate', unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', id: '2fa7c2ce-c075-4f2f-89eb-d12ddaa84d14', type: 'app'});
CREATE (n:Application {name: 'Postgress', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '37e8c102-fc8e-4f59-bf5a-bafb97ac5332', type: 'app'});
CREATE (n:Application {name: 'MailReciver', unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', id: '58ebb093-434e-4a2c-9d4d-f62e7faa89f0', type: 'app'});
CREATE (n:Application {name: 'WebApp', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '5cb89659-578c-4271-87c4-b1f8c28dfc80', type: 'app'});
CREATE (n:Application {name: 'RabbitMQ', unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', id: '7b97b454-76d2-49b2-b574-cdbf0bfeef0b', type: 'app'});
CREATE (n:Application {name: 'BackNotificationService', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: 'f208879c-0deb-4b6a-8eec-188684c9a749', type: 'app'});
CREATE (n:Component {name: 'EmailSender', unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', isPublic: false, id: '262184e2-0cd2-4497-8d52-4ad221469e8d', type: 'dependency', isDependency: true});
CREATE (n:Component {name: 'notification_page', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', isPublic: false, id: '45c11ee5-bafb-47ec-91ba-77c9a52d0425', type: 'component', isDependency: false});
CREATE (n:Component {name: 'notification_tables', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', isPublic: false, id: '588060df-7d8f-410e-9469-6e6db802c94c', type: 'dependency', isDependency: true});
CREATE (n:Component {name: 'user_tables', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', isPublic: false, id: '6df79abe-75a7-4db6-9b2f-d368d9a5f8bc', type: 'dependency', isDependency: true});
CREATE (n:Component {name: 'EmailReciever', unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', isPublic: true, id: '92c90625-9c49-4b7e-8c98-7fd2788c37b5', type: 'component', isDependency: false});
CREATE (n:Component {name: 'EmailQueue', unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', isPublic: false, id: 'cc8bf883-1724-4dcb-bdac-65ca81b363cb', type: 'dependency', isDependency: true});
CREATE (n:Component {name: 'notification_bell', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', isPublic: false, id: 'cdaa83dc-ff4b-43aa-ad8e-0930c39a44ac', type: 'component', isDependency: false});
CREATE (n:Component {name: 'notification_in_app-service', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', isPublic: false, id: 'e37c1c2c-ac75-4eaa-a42b-730dc2766af9', type: 'component', isDependency: false});
CREATE (n:Component {name: 'EmailSender', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', isPublic: true, id: 'ecb8934a-c4f6-404c-bb44-386bad2d0046', type: 'component', isDependency: false});
CREATE (n:FeatureVersion {name: 'SendEmail', id: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f', type: 'featureVersion', compatibility: 'compatible', version: '0', featureId: '1ba63eec-5f38-461a-83a1-ea1c6b5d037a', versionNumber: 0, status: 'active'});
CREATE (n:FeatureVersion {name: 'SendEmail', id: '4284a37b-4416-4be4-8af1-aff070861daa', type: 'featureVersion', compatibility: 'compatible', version: '0', featureId: 'f34c4159-9f08-47a2-9974-0cf5a21a5b26', versionNumber: 0, status: 'active'});
CREATE (n:FeatureVersion {name: 'SendNotificationInApp', id: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0', type: 'featureVersion', compatibility: 'compatible', version: '0', featureId: '80be4466-eb6b-4380-930a-bc26bf1eec20', versionNumber: 0, status: 'active'});
CREATE (n:ApplicationVersion {name: 'WebApp', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '0aa7947e-4d2a-4bb3-aca5-0dfcf7544909', applicationId: '5cb89659-578c-4271-87c4-b1f8c28dfc80', type: 'applicationVersion', version: '3', versionNumber: 3, status: 'current'});
CREATE (n:ApplicationVersion {name: 'Postgress', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '27774a4c-5de9-4d0e-9181-6f9e5922a398', applicationId: '37e8c102-fc8e-4f59-bf5a-bafb97ac5332', type: 'applicationVersion', version: '1', versionNumber: 1, status: 'current'});
CREATE (n:ApplicationVersion {name: 'BackNotificationService', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '41a7119a-238b-4934-93a4-e920465ca73f', applicationId: 'f208879c-0deb-4b6a-8eec-188684c9a749', type: 'applicationVersion', version: 'notify-back-1.0.0', versionNumber: 1, status: 'previous'});
CREATE (n:ApplicationVersion {name: 'WebApp', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '487d52ee-e937-4cc9-a99d-ecca52673a4c', applicationId: '5cb89659-578c-4271-87c4-b1f8c28dfc80', type: 'applicationVersion', version: '2', versionNumber: 2, status: 'previous'});
CREATE (n:ApplicationVersion {name: 'BackNotificationService', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '4b781f88-046c-4475-8673-b65477f2a81b', applicationId: 'f208879c-0deb-4b6a-8eec-188684c9a749', type: 'applicationVersion', version: 'notify-back-2.0.0', versionNumber: 2, status: 'current'});
CREATE (n:ApplicationVersion {name: 'WebApp', unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '51dc380b-6d38-4070-ab50-6b0828915c86', applicationId: '5cb89659-578c-4271-87c4-b1f8c28dfc80', type: 'applicationVersion', version: '1', versionNumber: 1, status: 'previous'});
CREATE (n:ApplicationVersion {name: 'MailReciver', unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', id: 'a66a755a-19bb-4f5e-b71c-a96be6a1157c', applicationId: '58ebb093-434e-4a2c-9d4d-f62e7faa89f0', type: 'applicationVersion', version: '1', versionNumber: 1, status: 'current'});
CREATE (n:ApplicationVersion {name: 'EmailGate', unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', id: 'c8c79faa-4da3-4c83-9db3-a6cc39bd7e7d', applicationId: '2fa7c2ce-c075-4f2f-89eb-d12ddaa84d14', type: 'applicationVersion', version: '1', versionNumber: 1, status: 'current'});
CREATE (n:ApplicationVersion {name: 'RabbitMQ', unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', id: 'ef99bce9-a7db-4fdf-8853-128b18bbad4d', applicationId: '7b97b454-76d2-49b2-b574-cdbf0bfeef0b', type: 'applicationVersion', version: '1', versionNumber: 1, status: 'current'});
CREATE (n:ComponentVersion {componentId: 'e37c1c2c-ac75-4eaa-a42b-730dc2766af9', contract: '{}', isPublic: false, unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '24f761a7-8e31-4e83-b305-bf22d4a1c25b', type: 'componentVersion', version: '0', versionNumber: 0, status: 'active'});
CREATE (n:ComponentVersion {componentId: '6df79abe-75a7-4db6-9b2f-d368d9a5f8bc', contract: '{}', isPublic: false, unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '377e713a-0106-471f-a332-9dada4437d95', type: 'componentVersion', version: '0', versionNumber: 0, status: 'active'});
CREATE (n:ComponentVersion {componentId: '588060df-7d8f-410e-9469-6e6db802c94c', contract: '{}', isPublic: false, unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '40b5c1be-14fa-4684-a86b-6eed0192f04a', type: 'componentVersion', version: '0', versionNumber: 0, status: 'active'});
CREATE (n:ComponentVersion {componentId: 'cc8bf883-1724-4dcb-bdac-65ca81b363cb', contract: '{}', isPublic: false, unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', id: '56eaf136-53d2-48e2-ab99-5e5f96dbd597', type: 'componentVersion', version: '0', versionNumber: 0, status: 'active'});
CREATE (n:ComponentVersion {componentId: 'cdaa83dc-ff4b-43aa-ad8e-0930c39a44ac', contract: '{}', isPublic: false, unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '5e3b66ab-8703-4a18-a33b-a01d5c2fe2f3', type: 'componentVersion', version: '0', versionNumber: 0, status: 'active'});
CREATE (n:ComponentVersion {componentId: '92c90625-9c49-4b7e-8c98-7fd2788c37b5', contract: '{}', isPublic: true, unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', id: '6657258b-7326-4b25-8b55-33e35a09cd3a', type: 'componentVersion', version: '0', versionNumber: 0, status: 'active'});
CREATE (n:ComponentVersion {componentId: '45c11ee5-bafb-47ec-91ba-77c9a52d0425', contract: '{}', isPublic: false, unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: '72ed66b3-7ec9-4e65-bcd4-eed30428b0b4', type: 'componentVersion', version: '0', versionNumber: 0, status: 'deprecated'});
CREATE (n:ComponentVersion {componentId: 'ecb8934a-c4f6-404c-bb44-386bad2d0046', contract: '{}', isPublic: true, unitId: 'b237b352-0299-4a8b-8bd2-d2826be958d5', id: 'cad93517-ec0b-4578-99b5-3aa016bda0b4', type: 'componentVersion', version: '0', versionNumber: 0, status: 'active'});
CREATE (n:ComponentVersion {componentId: '262184e2-0cd2-4497-8d52-4ad221469e8d', contract: '{}', isPublic: false, unitId: 'aae8e5d7-eb92-409a-8742-bf5394d12875', id: 'dc871090-a049-4aa7-a3fe-a9b3afa70f9a', type: 'componentVersion', version: '0', versionNumber: 0, status: 'active'});

// Relationships
MATCH (a:Unit {id: 'b237b352-0299-4a8b-8bd2-d2826be958d5'})
MATCH (b:Application {id: '37e8c102-fc8e-4f59-bf5a-bafb97ac5332'})
CREATE (a)-[:OWNS]->(b);
MATCH (a:Unit {id: 'b237b352-0299-4a8b-8bd2-d2826be958d5'})
MATCH (b:Application {id: 'f208879c-0deb-4b6a-8eec-188684c9a749'})
CREATE (a)-[:OWNS]->(b);
MATCH (a:Unit {id: 'b237b352-0299-4a8b-8bd2-d2826be958d5'})
MATCH (b:Application {id: '5cb89659-578c-4271-87c4-b1f8c28dfc80'})
CREATE (a)-[:OWNS]->(b);
MATCH (a:Unit {id: 'b237b352-0299-4a8b-8bd2-d2826be958d5'})
MATCH (b:Feature {id: '80be4466-eb6b-4380-930a-bc26bf1eec20'})
CREATE (a)-[:STAKEHOLDER]->(b);
MATCH (a:Unit {id: 'b237b352-0299-4a8b-8bd2-d2826be958d5'})
MATCH (b:Feature {id: '1ba63eec-5f38-461a-83a1-ea1c6b5d037a'})
CREATE (a)-[:STAKEHOLDER]->(b);
MATCH (a:Unit {id: 'b237b352-0299-4a8b-8bd2-d2826be958d5'})
MATCH (b:Service {id: '6868bc64-c032-423f-8730-413e55e28b13'})
CREATE (a)-[:PROVIDES]->(b);
MATCH (a:Unit {id: 'b237b352-0299-4a8b-8bd2-d2826be958d5'})
MATCH (b:Team {id: '3a839b23-9e11-45e4-931a-dacbfc9f18e9'})
CREATE (a)-[:HAS_TEAM]->(b);
MATCH (a:Unit {id: 'b237b352-0299-4a8b-8bd2-d2826be958d5'})
MATCH (b:Team {id: 'cb569a93-f741-4168-81b5-dc8e33f30cc5'})
CREATE (a)-[:HAS_TEAM]->(b);
MATCH (a:Team {id: 'cb569a93-f741-4168-81b5-dc8e33f30cc5'})
MATCH (b:Component {id: '45c11ee5-bafb-47ec-91ba-77c9a52d0425'})
CREATE (a)-[:MAINTAINS]->(b);
MATCH (a:Team {id: 'cb569a93-f741-4168-81b5-dc8e33f30cc5'})
MATCH (b:Component {id: 'cdaa83dc-ff4b-43aa-ad8e-0930c39a44ac'})
CREATE (a)-[:MAINTAINS]->(b);
MATCH (a:Team {id: '3a839b23-9e11-45e4-931a-dacbfc9f18e9'})
MATCH (b:Component {id: 'ecb8934a-c4f6-404c-bb44-386bad2d0046'})
CREATE (a)-[:MAINTAINS]->(b);
MATCH (a:Team {id: '3a839b23-9e11-45e4-931a-dacbfc9f18e9'})
MATCH (b:Component {id: 'e37c1c2c-ac75-4eaa-a42b-730dc2766af9'})
CREATE (a)-[:MAINTAINS]->(b);
MATCH (a:Team {id: '3a839b23-9e11-45e4-931a-dacbfc9f18e9'})
MATCH (b:Component {id: '588060df-7d8f-410e-9469-6e6db802c94c'})
CREATE (a)-[:MAINTAINS]->(b);
MATCH (a:Team {id: '3a839b23-9e11-45e4-931a-dacbfc9f18e9'})
MATCH (b:Component {id: '6df79abe-75a7-4db6-9b2f-d368d9a5f8bc'})
CREATE (a)-[:MAINTAINS]->(b);
MATCH (a:Service {id: '6868bc64-c032-423f-8730-413e55e28b13'})
MATCH (b:Feature {id: '80be4466-eb6b-4380-930a-bc26bf1eec20'})
CREATE (a)-[:AGGREGATES {deleted: false, id: 'a49db244-72c5-491d-b91a-9ba065383aef'}]->(b);
MATCH (a:Service {id: '6868bc64-c032-423f-8730-413e55e28b13'})
MATCH (b:Feature {id: '1ba63eec-5f38-461a-83a1-ea1c6b5d037a'})
CREATE (a)-[:AGGREGATES {deleted: false, id: '679bfc21-5819-4405-8e1e-e0798ea75b17'}]->(b);
MATCH (a:Feature {id: '1ba63eec-5f38-461a-83a1-ea1c6b5d037a'})
MATCH (b:FeatureVersion {id: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Feature {id: '80be4466-eb6b-4380-930a-bc26bf1eec20'})
MATCH (b:FeatureVersion {id: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Component {id: '6df79abe-75a7-4db6-9b2f-d368d9a5f8bc'})
MATCH (b:ComponentVersion {id: '377e713a-0106-471f-a332-9dada4437d95'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Component {id: '588060df-7d8f-410e-9469-6e6db802c94c'})
MATCH (b:ComponentVersion {id: '40b5c1be-14fa-4684-a86b-6eed0192f04a'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Component {id: 'cdaa83dc-ff4b-43aa-ad8e-0930c39a44ac'})
MATCH (b:ComponentVersion {id: '5e3b66ab-8703-4a18-a33b-a01d5c2fe2f3'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:ComponentVersion {id: '5e3b66ab-8703-4a18-a33b-a01d5c2fe2f3'})
MATCH (b:ComponentVersion {id: '24f761a7-8e31-4e83-b305-bf22d4a1c25b'})
CREATE (a)-[:DEPENDS_ON {consumerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', consumerApplicationId: '5cb89659-578c-4271-87c4-b1f8c28dfc80', consumerFeatureId: '80be4466-eb6b-4380-930a-bc26bf1eec20', consumerFeatureVersionId: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0', providerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', providerApplicationId: 'f208879c-0deb-4b6a-8eec-188684c9a749', providerFeatureId: '80be4466-eb6b-4380-930a-bc26bf1eec20', providerFeatureVersionId: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'}]->(b);
MATCH (a:Component {id: '45c11ee5-bafb-47ec-91ba-77c9a52d0425'})
MATCH (b:ComponentVersion {id: '72ed66b3-7ec9-4e65-bcd4-eed30428b0b4'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:ComponentVersion {id: '72ed66b3-7ec9-4e65-bcd4-eed30428b0b4'})
MATCH (b:ComponentVersion {id: '24f761a7-8e31-4e83-b305-bf22d4a1c25b'})
CREATE (a)-[:DEPENDS_ON {consumerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', consumerApplicationId: '5cb89659-578c-4271-87c4-b1f8c28dfc80', consumerFeatureId: '80be4466-eb6b-4380-930a-bc26bf1eec20', consumerFeatureVersionId: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0', providerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', providerApplicationId: 'f208879c-0deb-4b6a-8eec-188684c9a749', providerFeatureId: '80be4466-eb6b-4380-930a-bc26bf1eec20', providerFeatureVersionId: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'}]->(b);
MATCH (a:Component {id: 'e37c1c2c-ac75-4eaa-a42b-730dc2766af9'})
MATCH (b:ComponentVersion {id: '24f761a7-8e31-4e83-b305-bf22d4a1c25b'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:ComponentVersion {id: '24f761a7-8e31-4e83-b305-bf22d4a1c25b'})
MATCH (b:ComponentVersion {id: '40b5c1be-14fa-4684-a86b-6eed0192f04a'})
CREATE (a)-[:DEPENDS_ON {consumerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', consumerApplicationId: 'f208879c-0deb-4b6a-8eec-188684c9a749', consumerFeatureId: '80be4466-eb6b-4380-930a-bc26bf1eec20', consumerFeatureVersionId: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0', providerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', providerApplicationId: '37e8c102-fc8e-4f59-bf5a-bafb97ac5332', providerFeatureId: '80be4466-eb6b-4380-930a-bc26bf1eec20', providerFeatureVersionId: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'}]->(b);
MATCH (a:ComponentVersion {id: '24f761a7-8e31-4e83-b305-bf22d4a1c25b'})
MATCH (b:ComponentVersion {id: '377e713a-0106-471f-a332-9dada4437d95'})
CREATE (a)-[:DEPENDS_ON {consumerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', consumerApplicationId: 'f208879c-0deb-4b6a-8eec-188684c9a749', consumerFeatureId: '80be4466-eb6b-4380-930a-bc26bf1eec20', consumerFeatureVersionId: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0', providerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', providerApplicationId: '37e8c102-fc8e-4f59-bf5a-bafb97ac5332', providerFeatureId: '80be4466-eb6b-4380-930a-bc26bf1eec20', providerFeatureVersionId: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'}]->(b);
MATCH (a:Application {id: '5cb89659-578c-4271-87c4-b1f8c28dfc80'})
MATCH (b:ApplicationVersion {id: '0aa7947e-4d2a-4bb3-aca5-0dfcf7544909'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Application {id: '5cb89659-578c-4271-87c4-b1f8c28dfc80'})
MATCH (b:ApplicationVersion {id: '487d52ee-e937-4cc9-a99d-ecca52673a4c'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Application {id: '5cb89659-578c-4271-87c4-b1f8c28dfc80'})
MATCH (b:ApplicationVersion {id: '51dc380b-6d38-4070-ab50-6b0828915c86'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Application {id: 'f208879c-0deb-4b6a-8eec-188684c9a749'})
MATCH (b:ApplicationVersion {id: '4b781f88-046c-4475-8673-b65477f2a81b'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Application {id: 'f208879c-0deb-4b6a-8eec-188684c9a749'})
MATCH (b:ApplicationVersion {id: '41a7119a-238b-4934-93a4-e920465ca73f'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Application {id: '37e8c102-fc8e-4f59-bf5a-bafb97ac5332'})
MATCH (b:ApplicationVersion {id: '27774a4c-5de9-4d0e-9181-6f9e5922a398'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:ApplicationVersion {id: '51dc380b-6d38-4070-ab50-6b0828915c86'})
MATCH (b:ComponentVersion {id: '72ed66b3-7ec9-4e65-bcd4-eed30428b0b4'})
CREATE (a)-[:HAS_COMPONENT {status: 'active'}]->(b);
MATCH (a:ApplicationVersion {id: '487d52ee-e937-4cc9-a99d-ecca52673a4c'})
MATCH (b:ComponentVersion {id: '72ed66b3-7ec9-4e65-bcd4-eed30428b0b4'})
CREATE (a)-[:HAS_COMPONENT {status: 'active'}]->(b);
MATCH (a:ApplicationVersion {id: '487d52ee-e937-4cc9-a99d-ecca52673a4c'})
MATCH (b:ComponentVersion {id: '5e3b66ab-8703-4a18-a33b-a01d5c2fe2f3'})
CREATE (a)-[:HAS_COMPONENT {status: 'active'}]->(b);
MATCH (a:ApplicationVersion {id: '487d52ee-e937-4cc9-a99d-ecca52673a4c'})
MATCH (b:ApplicationVersion {id: '51dc380b-6d38-4070-ab50-6b0828915c86'})
CREATE (a)-[:INHERITED]->(b);
MATCH (a:ApplicationVersion {id: '27774a4c-5de9-4d0e-9181-6f9e5922a398'})
MATCH (b:ComponentVersion {id: '377e713a-0106-471f-a332-9dada4437d95'})
CREATE (a)-[:HAS_COMPONENT {status: 'active'}]->(b);
MATCH (a:ApplicationVersion {id: '27774a4c-5de9-4d0e-9181-6f9e5922a398'})
MATCH (b:ComponentVersion {id: '40b5c1be-14fa-4684-a86b-6eed0192f04a'})
CREATE (a)-[:HAS_COMPONENT {status: 'active'}]->(b);
MATCH (a:ApplicationVersion {id: '41a7119a-238b-4934-93a4-e920465ca73f'})
MATCH (b:ComponentVersion {id: '24f761a7-8e31-4e83-b305-bf22d4a1c25b'})
CREATE (a)-[:HAS_COMPONENT {status: 'active'}]->(b);
MATCH (a:ApplicationVersion {id: '0aa7947e-4d2a-4bb3-aca5-0dfcf7544909'})
MATCH (b:ComponentVersion {id: '5e3b66ab-8703-4a18-a33b-a01d5c2fe2f3'})
CREATE (a)-[:HAS_COMPONENT {status: 'active'}]->(b);
MATCH (a:ApplicationVersion {id: '0aa7947e-4d2a-4bb3-aca5-0dfcf7544909'})
MATCH (b:ComponentVersion {id: '72ed66b3-7ec9-4e65-bcd4-eed30428b0b4'})
CREATE (a)-[:HAS_COMPONENT {status: 'deprecated'}]->(b);
MATCH (a:ApplicationVersion {id: '0aa7947e-4d2a-4bb3-aca5-0dfcf7544909'})
MATCH (b:ApplicationVersion {id: '487d52ee-e937-4cc9-a99d-ecca52673a4c'})
CREATE (a)-[:INHERITED]->(b);
MATCH (a:Unit {id: 'aae8e5d7-eb92-409a-8742-bf5394d12875'})
MATCH (b:Application {id: '58ebb093-434e-4a2c-9d4d-f62e7faa89f0'})
CREATE (a)-[:OWNS]->(b);
MATCH (a:Unit {id: 'aae8e5d7-eb92-409a-8742-bf5394d12875'})
MATCH (b:Application {id: '7b97b454-76d2-49b2-b574-cdbf0bfeef0b'})
CREATE (a)-[:OWNS]->(b);
MATCH (a:Unit {id: 'aae8e5d7-eb92-409a-8742-bf5394d12875'})
MATCH (b:Team {id: '8a376cf5-db07-4ada-85eb-f00c6effae09'})
CREATE (a)-[:HAS_TEAM]->(b);
MATCH (a:Unit {id: 'aae8e5d7-eb92-409a-8742-bf5394d12875'})
MATCH (b:Feature {id: 'f34c4159-9f08-47a2-9974-0cf5a21a5b26'})
CREATE (a)-[:STAKEHOLDER]->(b);
MATCH (a:Unit {id: 'aae8e5d7-eb92-409a-8742-bf5394d12875'})
MATCH (b:Application {id: '2fa7c2ce-c075-4f2f-89eb-d12ddaa84d14'})
CREATE (a)-[:OWNS]->(b);
MATCH (a:Unit {id: 'aae8e5d7-eb92-409a-8742-bf5394d12875'})
MATCH (b:Service {id: '0ce504f2-176a-4000-a016-ba2692870120'})
CREATE (a)-[:PROVIDES]->(b);
MATCH (a:Service {id: '0ce504f2-176a-4000-a016-ba2692870120'})
MATCH (b:Feature {id: 'f34c4159-9f08-47a2-9974-0cf5a21a5b26'})
CREATE (a)-[:AGGREGATES {deleted: false, id: '5cf1a8bb-13db-4837-a28c-36fc40b723b1'}]->(b);
MATCH (a:Application {id: '2fa7c2ce-c075-4f2f-89eb-d12ddaa84d14'})
MATCH (b:ApplicationVersion {id: 'c8c79faa-4da3-4c83-9db3-a6cc39bd7e7d'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Feature {id: 'f34c4159-9f08-47a2-9974-0cf5a21a5b26'})
MATCH (b:FeatureVersion {id: '4284a37b-4416-4be4-8af1-aff070861daa'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Team {id: '8a376cf5-db07-4ada-85eb-f00c6effae09'})
MATCH (b:Component {id: '262184e2-0cd2-4497-8d52-4ad221469e8d'})
CREATE (a)-[:MAINTAINS]->(b);
MATCH (a:Team {id: '8a376cf5-db07-4ada-85eb-f00c6effae09'})
MATCH (b:Component {id: 'cc8bf883-1724-4dcb-bdac-65ca81b363cb'})
CREATE (a)-[:MAINTAINS]->(b);
MATCH (a:Team {id: '8a376cf5-db07-4ada-85eb-f00c6effae09'})
MATCH (b:Component {id: '92c90625-9c49-4b7e-8c98-7fd2788c37b5'})
CREATE (a)-[:MAINTAINS]->(b);
MATCH (a:Component {id: '92c90625-9c49-4b7e-8c98-7fd2788c37b5'})
MATCH (b:ComponentVersion {id: '6657258b-7326-4b25-8b55-33e35a09cd3a'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:ComponentVersion {id: '6657258b-7326-4b25-8b55-33e35a09cd3a'})
MATCH (b:ComponentVersion {id: '56eaf136-53d2-48e2-ab99-5e5f96dbd597'})
CREATE (a)-[:DEPENDS_ON {consumerServiceId: '0ce504f2-176a-4000-a016-ba2692870120', consumerApplicationId: '58ebb093-434e-4a2c-9d4d-f62e7faa89f0', consumerFeatureId: 'f34c4159-9f08-47a2-9974-0cf5a21a5b26', consumerFeatureVersionId: '4284a37b-4416-4be4-8af1-aff070861daa', providerServiceId: '0ce504f2-176a-4000-a016-ba2692870120', providerApplicationId: '7b97b454-76d2-49b2-b574-cdbf0bfeef0b', providerFeatureId: 'f34c4159-9f08-47a2-9974-0cf5a21a5b26', providerFeatureVersionId: '4284a37b-4416-4be4-8af1-aff070861daa'}]->(b);
MATCH (a:Component {id: 'cc8bf883-1724-4dcb-bdac-65ca81b363cb'})
MATCH (b:ComponentVersion {id: '56eaf136-53d2-48e2-ab99-5e5f96dbd597'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Component {id: '262184e2-0cd2-4497-8d52-4ad221469e8d'})
MATCH (b:ComponentVersion {id: 'dc871090-a049-4aa7-a3fe-a9b3afa70f9a'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:ComponentVersion {id: 'dc871090-a049-4aa7-a3fe-a9b3afa70f9a'})
MATCH (b:ComponentVersion {id: '56eaf136-53d2-48e2-ab99-5e5f96dbd597'})
CREATE (a)-[:DEPENDS_ON {consumerServiceId: '0ce504f2-176a-4000-a016-ba2692870120', consumerApplicationId: '2fa7c2ce-c075-4f2f-89eb-d12ddaa84d14', consumerFeatureId: 'f34c4159-9f08-47a2-9974-0cf5a21a5b26', consumerFeatureVersionId: '4284a37b-4416-4be4-8af1-aff070861daa', providerServiceId: '0ce504f2-176a-4000-a016-ba2692870120', providerApplicationId: '7b97b454-76d2-49b2-b574-cdbf0bfeef0b', providerFeatureId: 'f34c4159-9f08-47a2-9974-0cf5a21a5b26', providerFeatureVersionId: '4284a37b-4416-4be4-8af1-aff070861daa'}]->(b);
MATCH (a:Application {id: '7b97b454-76d2-49b2-b574-cdbf0bfeef0b'})
MATCH (b:ApplicationVersion {id: 'ef99bce9-a7db-4fdf-8853-128b18bbad4d'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:Application {id: '58ebb093-434e-4a2c-9d4d-f62e7faa89f0'})
MATCH (b:ApplicationVersion {id: 'a66a755a-19bb-4f5e-b71c-a96be6a1157c'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:ApplicationVersion {id: 'c8c79faa-4da3-4c83-9db3-a6cc39bd7e7d'})
MATCH (b:ComponentVersion {id: 'dc871090-a049-4aa7-a3fe-a9b3afa70f9a'})
CREATE (a)-[:HAS_COMPONENT {status: 'active'}]->(b);
MATCH (a:ApplicationVersion {id: 'a66a755a-19bb-4f5e-b71c-a96be6a1157c'})
MATCH (b:ComponentVersion {id: '6657258b-7326-4b25-8b55-33e35a09cd3a'})
CREATE (a)-[:HAS_COMPONENT {status: 'active'}]->(b);
MATCH (a:ApplicationVersion {id: 'ef99bce9-a7db-4fdf-8853-128b18bbad4d'})
MATCH (b:ComponentVersion {id: '56eaf136-53d2-48e2-ab99-5e5f96dbd597'})
CREATE (a)-[:HAS_COMPONENT {status: 'active'}]->(b);
MATCH (a:Component {id: 'ecb8934a-c4f6-404c-bb44-386bad2d0046'})
MATCH (b:ComponentVersion {id: 'cad93517-ec0b-4578-99b5-3aa016bda0b4'})
CREATE (a)-[:HAS_VERSION]->(b);
MATCH (a:ComponentVersion {id: 'cad93517-ec0b-4578-99b5-3aa016bda0b4'})
MATCH (b:ComponentVersion {id: '6657258b-7326-4b25-8b55-33e35a09cd3a'})
CREATE (a)-[:DEPENDS_ON {consumerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', consumerApplicationId: 'f208879c-0deb-4b6a-8eec-188684c9a749', consumerFeatureId: '1ba63eec-5f38-461a-83a1-ea1c6b5d037a', consumerFeatureVersionId: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f', providerServiceId: '0ce504f2-176a-4000-a016-ba2692870120', providerApplicationId: '58ebb093-434e-4a2c-9d4d-f62e7faa89f0', providerFeatureId: 'f34c4159-9f08-47a2-9974-0cf5a21a5b26', providerFeatureVersionId: '4284a37b-4416-4be4-8af1-aff070861daa'}]->(b);
MATCH (a:ComponentVersion {id: 'cad93517-ec0b-4578-99b5-3aa016bda0b4'})
MATCH (b:ComponentVersion {id: '40b5c1be-14fa-4684-a86b-6eed0192f04a'})
CREATE (a)-[:DEPENDS_ON {consumerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', consumerApplicationId: 'f208879c-0deb-4b6a-8eec-188684c9a749', consumerFeatureId: '1ba63eec-5f38-461a-83a1-ea1c6b5d037a', consumerFeatureVersionId: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f', providerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', providerApplicationId: '37e8c102-fc8e-4f59-bf5a-bafb97ac5332', providerFeatureId: '1ba63eec-5f38-461a-83a1-ea1c6b5d037a', providerFeatureVersionId: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f'}]->(b);
MATCH (a:ComponentVersion {id: 'cad93517-ec0b-4578-99b5-3aa016bda0b4'})
MATCH (b:ComponentVersion {id: '377e713a-0106-471f-a332-9dada4437d95'})
CREATE (a)-[:DEPENDS_ON {consumerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', consumerApplicationId: 'f208879c-0deb-4b6a-8eec-188684c9a749', consumerFeatureId: '1ba63eec-5f38-461a-83a1-ea1c6b5d037a', consumerFeatureVersionId: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f', providerServiceId: '6868bc64-c032-423f-8730-413e55e28b13', providerApplicationId: '37e8c102-fc8e-4f59-bf5a-bafb97ac5332', providerFeatureId: '1ba63eec-5f38-461a-83a1-ea1c6b5d037a', providerFeatureVersionId: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f'}]->(b);
MATCH (a:ApplicationVersion {id: '4b781f88-046c-4475-8673-b65477f2a81b'})
MATCH (b:ComponentVersion {id: '24f761a7-8e31-4e83-b305-bf22d4a1c25b'})
CREATE (a)-[:HAS_COMPONENT {status: 'active'}]->(b);
MATCH (a:ApplicationVersion {id: '4b781f88-046c-4475-8673-b65477f2a81b'})
MATCH (b:ComponentVersion {id: 'cad93517-ec0b-4578-99b5-3aa016bda0b4'})
CREATE (a)-[:HAS_COMPONENT {status: 'active'}]->(b);
MATCH (a:ApplicationVersion {id: '4b781f88-046c-4475-8673-b65477f2a81b'})
MATCH (b:ApplicationVersion {id: '41a7119a-238b-4934-93a4-e920465ca73f'})
CREATE (a)-[:INHERITED]->(b);
MATCH (a:FeatureVersion {id: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f'})
MATCH (b:ApplicationVersion {id: '27774a4c-5de9-4d0e-9181-6f9e5922a398'})
CREATE (a)-[:PINNED_TO_APPLICATION_VERSION]->(b);
MATCH (a:FeatureVersion {id: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f'})
MATCH (b:ApplicationVersion {id: '4b781f88-046c-4475-8673-b65477f2a81b'})
CREATE (a)-[:PINNED_TO_APPLICATION_VERSION]->(b);
MATCH (a:FeatureVersion {id: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f'})
MATCH (b:ApplicationVersion {id: 'a66a755a-19bb-4f5e-b71c-a96be6a1157c'})
CREATE (a)-[:PINNED_TO_APPLICATION_VERSION]->(b);
MATCH (a:FeatureVersion {id: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f'})
MATCH (b:ComponentVersion {id: '377e713a-0106-471f-a332-9dada4437d95'})
CREATE (a)-[:USES_COMPONENT_VERSION {id: '5fbc6226-6eea-45e9-8ac4-e3969d4dbdca', applicationId: '37e8c102-fc8e-4f59-bf5a-bafb97ac5332'}]->(b);
MATCH (a:FeatureVersion {id: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f'})
MATCH (b:ComponentVersion {id: '40b5c1be-14fa-4684-a86b-6eed0192f04a'})
CREATE (a)-[:USES_COMPONENT_VERSION {id: 'a5ca49b6-4284-4a0f-8471-fe5c5c922a30', applicationId: '37e8c102-fc8e-4f59-bf5a-bafb97ac5332'}]->(b);
MATCH (a:FeatureVersion {id: '2bf52afa-73c8-4a49-8b7f-eb30f502f51f'})
MATCH (b:ComponentVersion {id: 'cad93517-ec0b-4578-99b5-3aa016bda0b4'})
CREATE (a)-[:USES_COMPONENT_VERSION {id: 'a2ef8c15-42bc-402f-bec1-9f5465c5dbe6', applicationId: 'f208879c-0deb-4b6a-8eec-188684c9a749'}]->(b);
MATCH (a:FeatureVersion {id: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'})
MATCH (b:ApplicationVersion {id: '487d52ee-e937-4cc9-a99d-ecca52673a4c'})
CREATE (a)-[:PINNED_TO_APPLICATION_VERSION]->(b);
MATCH (a:FeatureVersion {id: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'})
MATCH (b:ApplicationVersion {id: '27774a4c-5de9-4d0e-9181-6f9e5922a398'})
CREATE (a)-[:PINNED_TO_APPLICATION_VERSION]->(b);
MATCH (a:FeatureVersion {id: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'})
MATCH (b:ApplicationVersion {id: '41a7119a-238b-4934-93a4-e920465ca73f'})
CREATE (a)-[:PINNED_TO_APPLICATION_VERSION]->(b);
MATCH (a:FeatureVersion {id: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'})
MATCH (b:ComponentVersion {id: '377e713a-0106-471f-a332-9dada4437d95'})
CREATE (a)-[:USES_COMPONENT_VERSION {id: '6115cb70-f821-43c0-a86a-65e4c0154505', applicationId: '37e8c102-fc8e-4f59-bf5a-bafb97ac5332'}]->(b);
MATCH (a:FeatureVersion {id: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'})
MATCH (b:ComponentVersion {id: '40b5c1be-14fa-4684-a86b-6eed0192f04a'})
CREATE (a)-[:USES_COMPONENT_VERSION {id: '07d378b8-134f-437e-aee7-25331e78d13a', applicationId: '37e8c102-fc8e-4f59-bf5a-bafb97ac5332'}]->(b);
MATCH (a:FeatureVersion {id: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'})
MATCH (b:ComponentVersion {id: '24f761a7-8e31-4e83-b305-bf22d4a1c25b'})
CREATE (a)-[:USES_COMPONENT_VERSION {id: 'ba3db9a3-6bba-4b8c-8bce-3591c12f1556', applicationId: 'f208879c-0deb-4b6a-8eec-188684c9a749'}]->(b);
MATCH (a:FeatureVersion {id: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'})
MATCH (b:ComponentVersion {id: '72ed66b3-7ec9-4e65-bcd4-eed30428b0b4'})
CREATE (a)-[:USES_COMPONENT_VERSION {id: '35130e15-2b2b-4d74-98bb-159e24ae0426', applicationId: '5cb89659-578c-4271-87c4-b1f8c28dfc80'}]->(b);
MATCH (a:FeatureVersion {id: '955f3d91-2319-47a6-a2f8-07e20ba8c1a0'})
MATCH (b:ComponentVersion {id: '5e3b66ab-8703-4a18-a33b-a01d5c2fe2f3'})
CREATE (a)-[:USES_COMPONENT_VERSION {id: '3d3faeec-1c72-453d-8177-1a7a981c5c6a', applicationId: '5cb89659-578c-4271-87c4-b1f8c28dfc80'}]->(b);
MATCH (a:FeatureVersion {id: '4284a37b-4416-4be4-8af1-aff070861daa'})
MATCH (b:ApplicationVersion {id: 'c8c79faa-4da3-4c83-9db3-a6cc39bd7e7d'})
CREATE (a)-[:PINNED_TO_APPLICATION_VERSION]->(b);
MATCH (a:FeatureVersion {id: '4284a37b-4416-4be4-8af1-aff070861daa'})
MATCH (b:ApplicationVersion {id: 'a66a755a-19bb-4f5e-b71c-a96be6a1157c'})
CREATE (a)-[:PINNED_TO_APPLICATION_VERSION]->(b);
MATCH (a:FeatureVersion {id: '4284a37b-4416-4be4-8af1-aff070861daa'})
MATCH (b:ApplicationVersion {id: 'ef99bce9-a7db-4fdf-8853-128b18bbad4d'})
CREATE (a)-[:PINNED_TO_APPLICATION_VERSION]->(b);
MATCH (a:FeatureVersion {id: '4284a37b-4416-4be4-8af1-aff070861daa'})
MATCH (b:ComponentVersion {id: 'dc871090-a049-4aa7-a3fe-a9b3afa70f9a'})
CREATE (a)-[:USES_COMPONENT_VERSION {id: 'a445b0c2-6499-403c-af57-f88e091dea8f', applicationId: '2fa7c2ce-c075-4f2f-89eb-d12ddaa84d14'}]->(b);
MATCH (a:FeatureVersion {id: '4284a37b-4416-4be4-8af1-aff070861daa'})
MATCH (b:ComponentVersion {id: '6657258b-7326-4b25-8b55-33e35a09cd3a'})
CREATE (a)-[:USES_COMPONENT_VERSION {id: '3d87f47c-271d-464a-b031-44d50de65ade', applicationId: '58ebb093-434e-4a2c-9d4d-f62e7faa89f0'}]->(b);
MATCH (a:FeatureVersion {id: '4284a37b-4416-4be4-8af1-aff070861daa'})
MATCH (b:ComponentVersion {id: '56eaf136-53d2-48e2-ab99-5e5f96dbd597'})
CREATE (a)-[:USES_COMPONENT_VERSION {id: '5b9d869a-9fae-4a14-a83e-38b3f9b86e79', applicationId: '7b97b454-76d2-49b2-b574-cdbf0bfeef0b'}]->(b);
