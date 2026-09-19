-- Table and index definitions from a Dune: Awakening single-player save (no data).

CREATE TABLE accounts (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT ,
	"user" TEXT UNIQUE NOT NULL ,
	"funcom_id" TEXT ,
	"takeoverable" INTEGER DEFAULT 0 ,
	"platform_id" TEXT ,
	"platform_name" TEXT 
 ) STRICT;

CREATE TABLE actor_fgl_entities (
	"actor_id" INTEGER REFERENCES actors("id") ON DELETE CASCADE ,
	"entity_id" INTEGER UNIQUE REFERENCES fgl_entities("entity_id") ,
	"slot_name" TEXT NOT NULL ,
	PRIMARY KEY("actor_id", "entity_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE actor_inventories (
	"inventory_id" INTEGER NOT NULL PRIMARY KEY REFERENCES inventories(id) ON DELETE CASCADE ,
	"component_name_hash" INTEGER NOT NULL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE actor_spawner_actors (
	"spawner_id" INTEGER NOT NULL PRIMARY KEY REFERENCES actor_spawners("id") ON DELETE CASCADE ,
	"actor_id" INTEGER REFERENCES actors("id") ON DELETE CASCADE 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE actor_spawners (
	"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT ,
	"map" TEXT NOT NULL ,
	"name" TEXT NOT NULL ,
	"dimension_index" INTEGER NOT NULL ,
	CONSTRAINT mapname_uniq UNIQUE(map, name, dimension_index)
 ) STRICT;

CREATE TABLE actors (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT Check(id > 0) ,
	"class" TEXT ,
	"map" TEXT ,
	"location_x" REAL ,
	"location_y" REAL ,
	"location_z" REAL ,
	"rotation_x" REAL ,
	"rotation_y" REAL ,
	"rotation_z" REAL ,
	"rotation_w" REAL ,
	"dimension_index" INTEGER NOT NULL DEFAULT 0 ,
	"gas_attributes" BLOB NOT NULL DEFAULT (jsonb('{}')) ,
	"properties" BLOB NOT NULL DEFAULT (jsonb('{}')) ,
	"owner_account_id" INTEGER ,
	"serial" INTEGER NOT NULL DEFAULT 0 ,
	"state" INTEGER NOT NULL DEFAULT 0 
 ) STRICT;

CREATE TABLE applied_patches(name TEXT PRIMARY KEY NOT NULL, date INTEGER UNIQUE NOT NULL);

CREATE TABLE backup_vehicles (
	"character_id" INTEGER NOT NULL REFERENCES player_state("id") ON DELETE CASCADE ,
	"vehicle_id" INTEGER NOT NULL REFERENCES vehicles("id") ON DELETE CASCADE ,
	"customization_id" TEXT ,
	CONSTRAINT backup_vehicles_character_uniq UNIQUE("character_id"),
	CONSTRAINT backup_vehicles_vehicle_uniq UNIQUE("vehicle_id"),
	PRIMARY KEY ("character_id", "vehicle_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE base_backup_linked_actors (
	"id" INTEGER NOT NULL REFERENCES base_backups("id") ON DELETE CASCADE ,
	"actor_id" INTEGER REFERENCES actors(id) ON DELETE CASCADE ,
	PRIMARY KEY("id", "actor_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE base_backups (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT Check(id > 0) ,
	"player_id" INTEGER REFERENCES actors(id) ON DELETE CASCADE ,
	"base_backup_name" TEXT ,
	"last_edited_by_player_id" INTEGER NOT NULL DEFAULT 0 
 ) STRICT;

CREATE TABLE building_blueprint_instances (
	"building_blueprint_id" INTEGER NOT NULL REFERENCES building_blueprints("id") ON DELETE CASCADE ,
	"instance_id" INTEGER NOT NULL ,
	"building_type" TEXT NOT NULL ,
	"transform_x" REAL ,
	"transform_y" REAL ,
	"transform_z" REAL ,
	"transform_yaw" REAL ,
	"provides_stability" INTEGER ,
	"health" REAL ,
	"hologram" INTEGER ,
	PRIMARY KEY("building_blueprint_id", "instance_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE building_blueprint_pentashields (
	"building_blueprint_id" INTEGER NOT NULL REFERENCES building_blueprints("id") ON DELETE CASCADE ,
	"placeable_id" INTEGER NOT NULL ,
	"scale_x" INTEGER ,
	"scale_y" INTEGER ,
	"scale_z" INTEGER ,
	PRIMARY KEY("building_blueprint_id", "placeable_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE building_blueprint_placeables (
	"building_blueprint_id" INTEGER NOT NULL REFERENCES building_blueprints("id") ON DELETE CASCADE ,
	"placeable_id" INTEGER NOT NULL ,
	"building_type" TEXT NOT NULL ,
	"transform_x" REAL ,
	"transform_y" REAL ,
	"transform_z" REAL ,
	"transform_yaw" REAL ,
	"transform_pitch" REAL ,
	"transform_roll" REAL ,
	"hologram" INTEGER ,
	PRIMARY KEY("building_blueprint_id", "placeable_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE building_blueprints (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT Check(id > 0) ,
	"item_id" INTEGER REFERENCES items("id") ON DELETE CASCADE ,
	"player_id" INTEGER REFERENCES actors(id) ON DELETE CASCADE ,
	"building_blueprint_map" TEXT 
 ) STRICT;

CREATE TABLE building_favorites (
	"character_id" INTEGER NOT NULL REFERENCES player_state("id") ON DELETE CASCADE ,
	"favorite_index" INTEGER NOT NULL ,
	"building_type" TEXT NOT NULL ,
	PRIMARY KEY("character_id", "favorite_index")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE building_instances (
	"building_id" INTEGER NOT NULL REFERENCES actors("id") ON DELETE CASCADE ,
	"instance_id" INTEGER NOT NULL ,
	"building_type" TEXT ,
	"location_x" REAL ,
	"location_y" REAL ,
	"location_z" REAL ,
	"rotation_x" REAL ,
	"rotation_y" REAL ,
	"rotation_z" REAL ,
	"rotation_w" REAL ,
	"owner_entity_id" INTEGER REFERENCES fgl_entities (entity_id) ON DELETE SET NULL ,
	"building_flags" INTEGER ,
	"health" REAL NOT NULL DEFAULT 0.0 ,
	"shelter" INTEGER NOT NULL DEFAULT 0 ,
	"sand_buildup" INTEGER NOT NULL DEFAULT 0 ,
	"last_placed_by_player_id" INTEGER NOT NULL DEFAULT 0 ,
	PRIMARY KEY("building_id", "instance_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE building_progression_learned_building_sets (
	"character_id" INTEGER NOT NULL REFERENCES player_state("id") ON DELETE CASCADE ,
	"learned_building_set" TEXT NOT NULL ,
	PRIMARY KEY("character_id", "learned_building_set")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE building_progression_new_buildable_pieces (
	"character_id" INTEGER NOT NULL REFERENCES player_state("id") ON DELETE CASCADE ,
	"new_buildable_piece" TEXT NOT NULL ,
	PRIMARY KEY("character_id", "new_buildable_piece")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE buildings (
	"id" INTEGER UNIQUE NOT NULL PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"owner_id" INTEGER 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE checkpoints (
	"account_id" INTEGER NOT NULL REFERENCES accounts("id") ON DELETE CASCADE ,
	"tag" TEXT NOT NULL ,
	PRIMARY KEY ("account_id", "tag")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE communinet_player (
	"account_id" INTEGER UNIQUE NOT NULL PRIMARY KEY REFERENCES accounts("id") ON DELETE CASCADE ,
	"is_active" INTEGER NOT NULL ,
	"selected_channel_name" TEXT NOT NULL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE communinet_player_channels (
	"account_id" INTEGER NOT NULL REFERENCES accounts("id") ON DELETE CASCADE ,
	"channel_name" TEXT NOT NULL ,
	"is_tuned" INTEGER NOT NULL ,
	PRIMARY KEY("account_id", "channel_name")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE consumed_per_player_lore (
	"actor_id" INTEGER PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"consumed_bit_array" TEXT NOT NULL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE consumed_temporary_per_player_lore (
	"actor_id" INTEGER PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"consumed_bit_array" TEXT NOT NULL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE coriolis_cycle (
	"onerow_id" INTEGER UNIQUE NOT NULL PRIMARY KEY ,
	"start_date_seconds" REAL NOT NULL ,
	"end_date_seconds" REAL NOT NULL ,
	"cycle_index" INTEGER NOT NULL ,
	CONSTRAINT onerow_uni CHECK (onerow_id)
 ) STRICT, WITHOUT ROWID;

CREATE TABLE dialogue_met_npcs (
	"player_id" INTEGER REFERENCES actors("id") ON DELETE CASCADE ,
	"npc_name" TEXT NOT NULL ,
	PRIMARY KEY ("player_id", "npc_name")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE dialogue_taken_nodes (
	"player_id" INTEGER REFERENCES actors("id") ON DELETE CASCADE ,
	"node_id" INTEGER ,
	PRIMARY KEY ("player_id", "node_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE dungeon_completion (
	"completion_id" INTEGER UNIQUE NOT NULL PRIMARY KEY AUTOINCREMENT ,
	"dungeon_id" TEXT NOT NULL ,
	"difficulty" INTEGER NOT NULL ,
	"duration_ms" INTEGER NOT NULL ,
	"players_num" INTEGER NOT NULL 
 ) STRICT;

CREATE TABLE dungeon_completion_players (
	"player_id" INTEGER NOT NULL REFERENCES actors("id") ON DELETE CASCADE ,
	"completion_id" INTEGER NOT NULL REFERENCES dungeon_completion("completion_id") ON DELETE CASCADE ,
	PRIMARY KEY ("player_id", "completion_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE encounters_static (
	"map_name" TEXT NOT NULL ,
	"package_name" TEXT NOT NULL ,
	"actor_name" TEXT NOT NULL ,
	"encounter_name" TEXT NOT NULL ,
	"waiting_for_reset" INTEGER NOT NULL DEFAULT 0 ,
	PRIMARY KEY("map_name", "package_name", "actor_name")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE factions (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT ,
	"name" TEXT UNIQUE NOT NULL 
 ) STRICT;

CREATE TABLE farm_variables (
	"one_row" INTEGER NOT NULL PRIMARY KEY DEFAULT 1 CHECK("one_row" = 1) ,
	"farm_id" BLOB ,
	"universe_time_timestamp" INTEGER NOT NULL ,
	"universe_lastactive_timestamp" INTEGER NOT NULL ,
	"down_time_accumulation" INTEGER NOT NULL DEFAULT 0 
 ) STRICT;

CREATE TABLE fgl_entities (
	"entity_id" INTEGER NOT NULL PRIMARY KEY Check(entity_id != 0) ,
	"components" BLOB 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE game_events (
	"actor_id" INTEGER NOT NULL REFERENCES actors("id") ON DELETE CASCADE ,
	"universe_time" INTEGER NOT NULL ,
	"map" TEXT NOT NULL ,
	"partition_id" INTEGER NOT NULL ,
	"event_type" INTEGER NOT NULL ,
	"x" REAL NOT NULL ,
	"y" REAL NOT NULL ,
	"z" REAL NOT NULL ,
	"custom_data" BLOB ,
	"player_facing_event" INTEGER NOT NULL DEFAULT 0 
 ) STRICT;

CREATE TABLE inventories (
	"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT Check(id > 0) ,
	"actor_id" INTEGER REFERENCES actors(id) ON DELETE CASCADE ,
	"item_id" INTEGER ,
	"vehicle_module_id" INTEGER ,
	"inventory_type" INTEGER ,
	"max_item_count" INTEGER ,
	"max_item_volume" REAL ,
	CONSTRAINT valid_fkey CHECK(actor_id IS NOT NULL OR item_id IS NOT NULL OR vehicle_module_id IS NOT NULL),
	CONSTRAINT inventories_vehicle_module_id_fkey FOREIGN KEY(vehicle_module_id) REFERENCES vehicle_modules(id) ON DELETE CASCADE,
	CONSTRAINT inventories_item_id_fkey FOREIGN KEY(item_id) REFERENCES items(id) ON DELETE CASCADE
 ) STRICT;

CREATE TABLE items (
	"id" INTEGER UNIQUE NOT NULL PRIMARY KEY AUTOINCREMENT ,
	"inventory_id" INTEGER REFERENCES inventories(id) ON DELETE CASCADE ,
	"stack_size" INTEGER NOT NULL CHECK (stack_size > 0) ,
	"position_index" INTEGER NOT NULL CHECK(position_index >= 0) ,
	"template_id" TEXT NOT NULL ,
	"is_new" INTEGER DEFAULT 0 ,
	"acquisition_time" INTEGER NOT NULL DEFAULT 0 ,
	"stats" TEXT NOT NULL ,
	"quality_level" INTEGER NOT NULL DEFAULT 0 ,
	"volume_override" REAL 
 ) STRICT;

CREATE TABLE items_id_sequencer (
	"next_id" INTEGER NOT NULL DEFAULT 1 
 ) STRICT;

CREATE TABLE journey_story_node (
	"character_id" INTEGER NOT NULL REFERENCES player_state("id") ON DELETE CASCADE ,
	"story_node_id" TEXT NOT NULL ,
	"override_reward_block" INTEGER NOT NULL DEFAULT 0 ,
	"complete_condition_state" BLOB ,
	"reveal_condition_state" BLOB ,
	"has_pending_reward" INTEGER NOT NULL DEFAULT 0 ,
	"metadata_state" BLOB ,
	"reset_group" INTEGER NOT NULL DEFAULT 0 ,
	"fail_condition_state" BLOB ,
	PRIMARY KEY ("character_id", "story_node_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE journey_story_node_cooldown (
	"character_id" INTEGER NOT NULL REFERENCES player_state("id") ON DELETE CASCADE ,
	"story_node_id" TEXT NOT NULL ,
	"time_to_expire" INTEGER ,
	PRIMARY KEY ("character_id", "story_node_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE journey_tracked_cards (
	"player_id" INTEGER UNIQUE NOT NULL PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"tracked_journey_card" TEXT ,
	"tracked_landsraad_card" TEXT 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE landclaim_segments (
	"totem_id" INTEGER REFERENCES actors("id") ON DELETE CASCADE ,
	"grid_location_x" INTEGER NOT NULL ,
	"grid_location_y" INTEGER NOT NULL ,
	PRIMARY KEY("totem_id", "grid_location_x", "grid_location_y")
 ) STRICT;

CREATE TABLE landsraad_decree_rotation (
	"decree_id" INTEGER NOT NULL REFERENCES landsraad_decrees("id") ON DELETE CASCADE 
 ) STRICT;

CREATE TABLE landsraad_decree_term (
	"term_id" INTEGER NOT NULL PRIMARY KEY ,
	"start_time" INTEGER NOT NULL ,
	"end_time" INTEGER NOT NULL ,
	"reigning_faction_id" INTEGER DEFAULT NULL ,
	"active_decree_id" INTEGER DEFAULT NULL ,
	"winning_faction_id" INTEGER DEFAULT NULL ,
	"elected_decree_id" INTEGER DEFAULT NULL ,
	"test_term" INTEGER NOT NULL DEFAULT 0 ,
	"last_processed_reveal_day" INTEGER DEFAULT 0 CHECK(last_processed_reveal_day >= 0) ,
	"decree_reroll_attempts" INTEGER DEFAULT 0 CHECK(decree_reroll_attempts >= 0) ,
	CONSTRAINT landsraad_term_reigning_faction_id_fk FOREIGN KEY ("reigning_faction_id") REFERENCES factions ("id") ON DELETE SET NULL,
	CONSTRAINT landsraad_term_active_decree_id_fk FOREIGN KEY ("active_decree_id") REFERENCES landsraad_decrees ("id") ON DELETE SET NULL,
	CONSTRAINT landsraad_term_winning_faction_id_fk FOREIGN KEY ("winning_faction_id") REFERENCES factions ("id") ON DELETE SET NULL,
	CONSTRAINT landsraad_term_elected_decree_id_fk FOREIGN KEY ("elected_decree_id") REFERENCES landsraad_decrees ("id") ON DELETE SET NULL
 ) STRICT;

CREATE TABLE landsraad_decree_votes (
	"decree_id" INTEGER NOT NULL ,
	"guild_id" INTEGER UNIQUE ,
	"player_id" INTEGER ,
	"influence" INTEGER NOT NULL CHECK(influence >= 0) ,
	CONSTRAINT landsraad_votes_decree_id_fk FOREIGN KEY ("decree_id") REFERENCES landsraad_decrees ("id") ON DELETE CASCADE,
	CONSTRAINT landsraad_votes_player_id_fk FOREIGN KEY ("player_id") REFERENCES actors("id") ON DELETE SET NULL
 ) STRICT;

CREATE TABLE landsraad_decrees (
	"id" INTEGER UNIQUE NOT NULL PRIMARY KEY AUTOINCREMENT ,
	"decree_name" TEXT UNIQUE NOT NULL ,
	"version" INTEGER NOT NULL DEFAULT 0 ,
	"disabled" INTEGER NOT NULL DEFAULT 0 ,
	"weight" REAL NOT NULL DEFAULT 1.0 
 ) STRICT;

CREATE TABLE landsraad_house_rewards (
	"player_id" INTEGER NOT NULL ,
	"house_name" TEXT NOT NULL ,
	"amount" INTEGER NOT NULL DEFAULT 0 ,
	"template_id" TEXT NOT NULL ,
	"last_updated" INTEGER NOT NULL DEFAULT 0 ,
	UNIQUE(player_id, house_name, template_id),
	CONSTRAINT landsraad_house_rewards_player_id_fk FOREIGN KEY ("player_id") REFERENCES actors ("id") ON DELETE CASCADE,
	PRIMARY KEY ("player_id", "house_name", "template_id")
 ) STRICT;

CREATE TABLE landsraad_simulated_guilds (
	"guild_actor_id" INTEGER NOT NULL REFERENCES actors("id") ON DELETE CASCADE ,
	"guild_identifier" TEXT UNIQUE NOT NULL 
 ) STRICT;

CREATE TABLE landsraad_task_faction_contributions (
	"faction_id" INTEGER NOT NULL ,
	"task_id" INTEGER NOT NULL ,
	"amount" REAL NOT NULL DEFAULT 0.0 ,
	CONSTRAINT landsraad_task_faction_contributions_faction_id_fk FOREIGN KEY ("faction_id") REFERENCES factions ("id") ON DELETE CASCADE,
	CONSTRAINT landsraad_task_faction_contributions_task_id_fk FOREIGN KEY ("task_id") REFERENCES landsraad_tasks ("id") ON DELETE CASCADE,
	UNIQUE(task_id, faction_id),
	PRIMARY KEY ("faction_id", "task_id")
 ) STRICT;

CREATE TABLE landsraad_task_player_contributions (
	"player_id" INTEGER ,
	"faction_id" INTEGER NOT NULL ,
	"task_id" INTEGER NOT NULL ,
	"amount" REAL NOT NULL DEFAULT 0.0 ,
	CONSTRAINT landsraad_task_player_contributions_player_id_fk FOREIGN KEY ("player_id") REFERENCES actors ("id") ON DELETE CASCADE,
	CONSTRAINT landsraad_task_player_contributions_faction_id_fk FOREIGN KEY ("faction_id") REFERENCES factions ("id") ON DELETE CASCADE,
	CONSTRAINT landsraad_task_player_contributions_task_id_fk FOREIGN KEY ("task_id") REFERENCES landsraad_tasks ("id") ON DELETE CASCADE,
	UNIQUE(player_id, faction_id, task_id),
	PRIMARY KEY ("player_id", "faction_id", "task_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE landsraad_task_progress (
	"id" INTEGER NOT NULL PRIMARY KEY ,
	"faction_id" INTEGER NOT NULL ,
	"task_id" INTEGER NOT NULL ,
	"faction_progress" INTEGER NOT NULL CHECK(faction_progress >= 0) ,
	"guild_progress" REAL NOT NULL CHECK(guild_progress >= 0.0) ,
	"player_progress" REAL NOT NULL CHECK(player_progress >= 0.0) ,
	"timestamp" INTEGER NOT NULL DEFAULT 0 ,
	CONSTRAINT landsraad_task_progress_faction_id_fk FOREIGN KEY ("faction_id") REFERENCES factions ("id") ON DELETE CASCADE,
	CONSTRAINT landsraad_task_progress_task_id_fk FOREIGN KEY ("task_id") REFERENCES landsraad_tasks ("id") ON DELETE CASCADE,
	CONSTRAINT landsraad_task_progress_anyprogress_positive CHECK(faction_progress > 0 OR guild_progress > 0.0 OR player_progress > 0.0)
 ) STRICT;

CREATE TABLE landsraad_task_progress_player (
	"progress_id" INTEGER NOT NULL PRIMARY KEY ,
	"player_id" INTEGER ,
	CONSTRAINT landsraad_task_progress_progress_id_fk FOREIGN KEY ("progress_id") REFERENCES landsraad_task_progress ("id") ON DELETE CASCADE,
	CONSTRAINT landsraad_task_progress_player_id_fk FOREIGN KEY ("player_id") REFERENCES actors ("id") ON DELETE CASCADE,
	UNIQUE(progress_id, player_id)
 ) STRICT;

CREATE TABLE landsraad_task_progress_processed (
	"id" INTEGER NOT NULL PRIMARY KEY ,
	"last_processed_id" INTEGER NOT NULL CHECK (id = 1) 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE landsraad_task_reveal_state (
	"task_id" INTEGER NOT NULL ,
	"faction_id" INTEGER NOT NULL ,
	"revealed" INTEGER NOT NULL ,
	"timestamp" INTEGER NOT NULL DEFAULT -1 ,
	UNIQUE(task_id, faction_id),
	CONSTRAINT landsraad_task_reveal_state_faction_id_fk FOREIGN KEY ("faction_id") REFERENCES factions ("id") ON DELETE CASCADE,
	CONSTRAINT landsraad_task_reveal_state_task_id_fk FOREIGN KEY ("task_id") REFERENCES landsraad_tasks ("id") ON DELETE CASCADE,
	PRIMARY KEY ("task_id", "faction_id")
 ) STRICT;

CREATE TABLE landsraad_task_rewards (
	"task_id" INTEGER NOT NULL ,
	"threshold" INTEGER NOT NULL CHECK(threshold > 0) ,
	"template_id" TEXT NOT NULL ,
	"amount" INTEGER NOT NULL CHECK(amount > 0) ,
	CONSTRAINT landsraad_task_rewards_task_id_fk FOREIGN KEY ("task_id") REFERENCES landsraad_tasks ("id") ON DELETE CASCADE
 ) STRICT;

CREATE TABLE landsraad_tasks (
	"id" INTEGER NOT NULL PRIMARY KEY ,
	"term_id" INTEGER NOT NULL ,
	"board_index" INTEGER NOT NULL CHECK(board_index >= 0) ,
	"house_name" TEXT NOT NULL ,
	"completed" INTEGER NOT NULL DEFAULT 0 ,
	"winning_faction_id" INTEGER DEFAULT NULL ,
	"sysselraad" INTEGER NOT NULL DEFAULT 0 ,
	"goal_amount" INTEGER NOT NULL DEFAULT 0 ,
	"completion_time" INTEGER DEFAULT NULL ,
	CONSTRAINT landsraad_task_term_id_fk FOREIGN KEY ("term_id") REFERENCES landsraad_decree_term ("term_id") ON DELETE CASCADE,
	CONSTRAINT landsraad_task_winning_faction_id_fk FOREIGN KEY ("winning_faction_id") REFERENCES factions ("id") ON DELETE SET NULL,
	UNIQUE(term_id, board_index)UNIQUE(term_id, house_name)
 ) STRICT;

CREATE TABLE loot_container_items (
	"unique_id" TEXT NOT NULL ,
	"template_id" TEXT NOT NULL ,
	"stack_size" INTEGER NOT NULL ,
	"volume_multiplier" REAL NOT NULL ,
	"volume_override" REAL NOT NULL ,
	"quality" INTEGER NOT NULL ,
	"durability_percentage" REAL NOT NULL ,
	"max_durability_percentage" REAL NOT NULL ,
	"stats" BLOB NOT NULL ,
	"priority" INTEGER NOT NULL ,
	PRIMARY KEY("unique_id", "template_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE loot_container_timestamps (
	"unique_id" TEXT NOT NULL PRIMARY KEY ,
	"target_reset_timestamp" REAL NOT NULL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE lore_pickups (
	"incremental_id" INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT ,
	"lore_pickup_id" TEXT UNIQUE NOT NULL 
 ) STRICT;

CREATE TABLE lore_pickups_temporary (
	"incremental_id" INTEGER UNIQUE PRIMARY KEY AUTOINCREMENT ,
	"lore_pickup_id" TEXT UNIQUE NOT NULL 
 ) STRICT;

CREATE TABLE map_areas (
	"character_id" INTEGER NOT NULL REFERENCES player_state("id") ON DELETE CASCADE ,
	"area_id" INTEGER ,
	"time_discovered" INTEGER ,
	"time_first_entered" INTEGER ,
	"survey_point_marker_id" INTEGER ,
	"map" TEXT NOT NULL ,
	"items_surveyed_target" BLOB ,
	"items_surveyed_progress" BLOB ,
	PRIMARY KEY(character_id, area_id, map)
 ) STRICT, WITHOUT ROWID;

CREATE TABLE markers (
	"marker_hash_id" INTEGER NOT NULL ,
	"dimension_index" INTEGER NOT NULL ,
	"map_name" TEXT NOT NULL ,
	"marker_type" TEXT ,
	"x" REAL ,
	"y" REAL ,
	"z" REAL ,
	"area_id" INTEGER ,
	"area_radius" REAL ,
	"long_range" INTEGER ,
	"payload" BLOB ,
	"payload_type" INTEGER ,
	PRIMARY KEY("marker_hash_id", "dimension_index", "map_name")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE overmap_players (
	"player_id" INTEGER UNIQUE NOT NULL PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"overmap_location_x" REAL ,
	"overmap_location_y" REAL ,
	"overmap_location_z" REAL ,
	"has_polar_psu" INTEGER DEFAULT 0 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE permission_actor (
	"actor_id" INTEGER NOT NULL PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"actor_name" TEXT ,
	"actor_type" INTEGER NOT NULL ,
	"access_level" INTEGER NOT NULL ,
	"is_child" INTEGER NOT NULL ,
	"edited_by_player_id" INTEGER 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE permission_actor_rank (
	"permission_actor_id" INTEGER NOT NULL REFERENCES permission_actor("actor_id") ON DELETE CASCADE ,
	"player_id" INTEGER NOT NULL REFERENCES actors("id") ON DELETE CASCADE ,
	"rank" INTEGER NOT NULL ,
	PRIMARY KEY ("permission_actor_id", "player_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE placeables (
	"id" INTEGER UNIQUE NOT NULL PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"owner_entity_id" INTEGER REFERENCES fgl_entities (entity_id) ON DELETE SET NULL ,
	"health" REAL ,
	"building_type" TEXT ,
	"has_hit_ground" INTEGER NOT NULL DEFAULT 0 ,
	"has_buildable_support" INTEGER NOT NULL DEFAULT 0 ,
	"is_hologram" INTEGER NOT NULL DEFAULT 0 ,
	"last_placed_by_player_id" INTEGER NOT NULL DEFAULT 0 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE player_access_codes (
	"character_id" INTEGER NOT NULL REFERENCES player_state("id") ON DELETE CASCADE ,
	"access_code" INTEGER NOT NULL ,
	"access_code_type" INTEGER NOT NULL ,
	"is_resettable" INTEGER NOT NULL DEFAULT 0 ,
	PRIMARY KEY("character_id", "access_code", "access_code_type")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE player_faction (
	"actor_id" INTEGER PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"faction_id" INTEGER NOT NULL REFERENCES factions("id") ON DELETE CASCADE ,
	"utc_time_faction_change" INTEGER NOT NULL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE player_faction_reputation (
	"actor_id" INTEGER ,
	"faction_id" INTEGER ,
	"reputation_amount" INTEGER ,
	PRIMARY KEY ("actor_id", "faction_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE player_markers (
	"player_id" INTEGER NOT NULL REFERENCES actors("id") ON DELETE CASCADE ,
	"marker_hash_id" INTEGER NOT NULL ,
	"dimension_index" INTEGER NOT NULL ,
	"map_name" TEXT NOT NULL ,
	"discovery_level" INTEGER NOT NULL ,
	"discovery_method" INTEGER NOT NULL ,
	"payload" BLOB ,
	FOREIGN KEY("marker_hash_id", "dimension_index", "map_name") REFERENCES markers("marker_hash_id", "dimension_index", "map_name") ON DELETE CASCADE,
	PRIMARY KEY("player_id", "marker_hash_id", "dimension_index", "map_name")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE player_respawn_locations (
	"id" BLOB UNIQUE NOT NULL ,
	"character_id" INTEGER NOT NULL REFERENCES player_state("id") ON DELETE CASCADE ,
	"group" TEXT NOT NULL ,
	"locator_location_x" REAL ,
	"locator_location_y" REAL ,
	"locator_location_z" REAL ,
	"locator_rotation_x" REAL ,
	"locator_rotation_y" REAL ,
	"locator_rotation_z" REAL ,
	"locator_rotation_w" REAL ,
	"locator_actor_id" INTEGER REFERENCES actors("id") ON DELETE CASCADE ,
	"locator_name" TEXT ,
	"map" TEXT NOT NULL ,
	"dimension" INTEGER NOT NULL ,
	"last_used_timestamp" INTEGER DEFAULT 0 ,
	"locator_name_index" INTEGER ,
	PRIMARY KEY(id, character_id)
 ) STRICT, WITHOUT ROWID;

CREATE TABLE player_state (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT ,
	"account_id" INTEGER UNIQUE NOT NULL REFERENCES accounts("id") ON DELETE CASCADE ,
	"character_name" TEXT NOT NULL ,
	"last_avatar_activity" INTEGER DEFAULT NULL ,
	"server_id" TEXT ,
	"player_controller_id" INTEGER REFERENCES actors("id") ON DELETE SET NULL ,
	"player_pawn_id" INTEGER REFERENCES actors("id") ON DELETE SET NULL ,
	"player_state_id" INTEGER REFERENCES actors("id") ON DELETE SET NULL ,
	"pending_respawn_location_id" BLOB ,
	"life_state" INTEGER NOT NULL DEFAULT 0 ,
	"online_status" INTEGER NOT NULL DEFAULT 0 ,
	"reconnect_grace_period_end" INTEGER DEFAULT NULL ,
	"previous_server_partition_id" INTEGER ,
	"is_coriolis_processed" INTEGER NOT NULL DEFAULT 0 ,
	"return_dimension_index" INTEGER DEFAULT NULL ,
	"death_location_x" REAL ,
	"death_location_y" REAL ,
	"death_location_z" REAL ,
	"death_map" TEXT ,
	"death_dimension" INTEGER ,
	"home_dimension_index" INTEGER DEFAULT NULL ,
	"logoff_persistence_end_time" INTEGER DEFAULT NULL ,
	"last_login_time" INTEGER DEFAULT NULL ,
	"last_returning_player_event_time" INTEGER DEFAULT NULL ,
	"last_returning_player_awarded_time" INTEGER DEFAULT NULL ,
	"character_state" INTEGER NOT NULL DEFAULT 0 
 ) STRICT;

CREATE TABLE player_tags (
	"character_id" INTEGER NOT NULL REFERENCES player_state("id") ON DELETE CASCADE ,
	"tag" TEXT NOT NULL ,
	PRIMARY KEY ("character_id", "tag")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE player_travel_state (
	"fls_id" TEXT PRIMARY KEY ,
	"login_target_dimension_index" INTEGER DEFAULT NULL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE player_virtual_currency_balances (
	"player_controller_id" INTEGER REFERENCES actors("id") ON DELETE CASCADE ,
	"currency_id" INTEGER NOT NULL ,
	"balance" INTEGER NOT NULL ,
	PRIMARY KEY(player_controller_id, currency_id)
 ) STRICT, WITHOUT ROWID;

CREATE TABLE purchased_specialization_keystones (
	"player_id" INTEGER NOT NULL REFERENCES actors("id") ON DELETE CASCADE ,
	"keystone_id" INTEGER NOT NULL REFERENCES specialization_keystones_map("id") ON DELETE CASCADE ,
	PRIMARY KEY (player_id, keystone_id)
 ) STRICT, WITHOUT ROWID;

CREATE TABLE recovered_vehicles (
	"character_id" INTEGER NOT NULL REFERENCES player_state("id") ON DELETE CASCADE ,
	"vehicle_id" INTEGER NOT NULL REFERENCES vehicles("id") ON DELETE CASCADE ,
	"time_stored" INTEGER NOT NULL DEFAULT (unixepoch('now')) ,
	"chassis_durability" REAL NOT NULL ,
	"vehicle_name" TEXT ,
	"customization_id" TEXT ,
	"reason" INTEGER DEFAULT 0 ,
	"edited_by_player_id" INTEGER ,
	CONSTRAINT recovered_vehicles_vehicle_uniq UNIQUE("vehicle_id"),
	PRIMARY KEY ("character_id", "vehicle_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE resource_nodes (
	"map" TEXT NOT NULL ,
	"resource_id" INTEGER NOT NULL ,
	"node_index" INTEGER NOT NULL ,
	"target_reset_timestamp" REAL NOT NULL ,
	PRIMARY KEY("map", "resource_id", "node_index")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE resourcefield_state (
	"field_id" INTEGER NOT NULL ,
	"map" TEXT NOT NULL ,
	"dimension_index" INTEGER NOT NULL DEFAULT 0 ,
	"spawn_time" REAL NOT NULL ,
	"value_remaining" INTEGER NOT NULL ,
	PRIMARY KEY("field_id", "map", "dimension_index")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE sandstorm_data (
	"map" TEXT NOT NULL PRIMARY KEY ,
	"start_location_x" REAL NOT NULL ,
	"start_location_y" REAL NOT NULL ,
	"start_location_z" REAL NOT NULL ,
	"end_location_x" REAL NOT NULL ,
	"end_location_y" REAL NOT NULL ,
	"end_location_z" REAL NOT NULL ,
	"start_farmtime_seconds" REAL NOT NULL ,
	"end_farmtime_seconds" REAL NOT NULL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE sandstorm_schedule (
	"map" TEXT NOT NULL PRIMARY KEY ,
	"next_spawn_farmtime_seconds" INTEGER NOT NULL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE specialization_keystones_map (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT ,
	"name" TEXT UNIQUE NOT NULL 
 ) STRICT;

CREATE TABLE specialization_refund_id (
	"player_id" INTEGER PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"refund_id" INTEGER 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE specialization_tracks (
	"player_id" INTEGER NOT NULL REFERENCES actors("id") ON DELETE CASCADE ,
	"track_type" INTEGER NOT NULL ,
	"xp_amount" INTEGER NOT NULL ,
	"level" REAL NOT NULL ,
	PRIMARY KEY (player_id, track_type)
 ) STRICT, WITHOUT ROWID;

CREATE TABLE totem_fuel_update_times (
	"totem_id" INTEGER NOT NULL PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"last_fuel_update_farm_uptime" INTEGER NOT NULL ,
	"last_fuel_update_universe_time" INTEGER NOT NULL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE totems (
	"id" INTEGER UNIQUE NOT NULL PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"landclaim_vertical_level" INTEGER ,
	"last_backup_timestamp" INTEGER ,
	"landclaim_original_global_location_x" REAL ,
	"landclaim_original_global_location_y" REAL ,
	"landclaim_original_global_location_z" REAL ,
	"landclaim_original_global_yaw_rotation" REAL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE travel_actor_parent (
	"id" INTEGER UNIQUE NOT NULL PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"parent_id" INTEGER NOT NULL REFERENCES actors("id") ON DELETE CASCADE ,
	"is_instigator" INTEGER NOT NULL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE travel_return_info (
	"player_controller_id" INTEGER UNIQUE NOT NULL PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE ,
	"map" TEXT ,
	"location_x" REAL ,
	"location_y" REAL ,
	"location_z" REAL ,
	"rotation_x" REAL ,
	"rotation_y" REAL ,
	"rotation_z" REAL ,
	"rotation_w" REAL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE tutorial_per_player (
	"player_id" INTEGER NOT NULL REFERENCES actors("id") ON DELETE CASCADE ,
	"tutorial_id" INTEGER NOT NULL REFERENCES tutorials("id") ON DELETE CASCADE ,
	"tutorial_state" INTEGER NOT NULL DEFAULT 0 ,
	PRIMARY KEY ("player_id", "tutorial_id")
 ) STRICT, WITHOUT ROWID;

CREATE TABLE tutorials (
	"id" INTEGER PRIMARY KEY AUTOINCREMENT ,
	"name" TEXT UNIQUE NOT NULL 
 ) STRICT;

CREATE TABLE vehicle_module_inventories (
	"inventory_id" INTEGER NOT NULL PRIMARY KEY REFERENCES inventories("id") ON DELETE CASCADE ,
	"vehicle_module_inventory_type" INTEGER NOT NULL 
 ) STRICT, WITHOUT ROWID;

CREATE TABLE vehicle_modules (
	"id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT ,
	"vehicle_id" INTEGER REFERENCES vehicles("id") ON DELETE CASCADE ,
	"template_id" TEXT NOT NULL ,
	"stats" BLOB NOT NULL 
 ) STRICT;

CREATE TABLE vehicles (
	"id" INTEGER NOT NULL PRIMARY KEY REFERENCES actors("id") ON DELETE CASCADE 
 );

CREATE TABLE vendor_stock_cycle (
	"vendor_id" TEXT ,
	"player_id" INTEGER REFERENCES actors("id") ON DELETE CASCADE ,
	"last_interacted_timestamp" INTEGER ,
	PRIMARY KEY(vendor_id, player_id)
 ) STRICT, WITHOUT ROWID;

CREATE TABLE vendor_stock_state (
	"vendor_id" TEXT ,
	"player_id" INTEGER REFERENCES actors("id") ON DELETE CASCADE ,
	"template_id" TEXT ,
	"amount_bought" INTEGER ,
	PRIMARY KEY ("vendor_id", "player_id", "template_id")
 ) STRICT, WITHOUT ROWID;

CREATE INDEX actor_inventories_inventory_id_fk_idx ON actor_inventories ("inventory_id");

CREATE INDEX actors_owner_account_id_idx ON actors (("owner_account_id" is null));

CREATE INDEX actors_state_idx ON actors ("state");

CREATE INDEX building_instances_building_id_fk_idx ON building_instances ("building_id");

CREATE INDEX building_instances_owner_entity_id_idx ON building_instances ("owner_entity_id");

CREATE INDEX dialogue_taken_nodes_player_id_fk_idx ON dialogue_taken_nodes ("player_id");

CREATE INDEX dungeon_completion_dungeon_id ON dungeon_completion ("dungeon_id");

CREATE INDEX dungeon_completion_players_player_id ON dungeon_completion_players ("player_id");

CREATE INDEX game_events_actor_id_idx ON game_events ("actor_id");

CREATE INDEX inventory_actor_id_idx ON inventories ("actor_id");

CREATE INDEX inventory_component_name_hash_idx ON actor_inventories ("component_name_hash");

CREATE INDEX inventory_item_id_idx ON inventories ("item_id");

CREATE INDEX item_inventory_id_idx ON items ("inventory_id");

CREATE INDEX journey_story_node_cooldown_character_idx ON journey_story_node_cooldown ("character_id");

CREATE INDEX journey_story_node_cooldown_time_to_expire_idx ON journey_story_node_cooldown ("time_to_expire");

CREATE INDEX journey_story_node_reset_group_idx ON journey_story_node ("reset_group");

CREATE INDEX landclaim_segments_idx ON landclaim_segments ("totem_id");

CREATE INDEX landsraad_house_rewards_player_id_idx ON landsraad_house_rewards ("player_id");

CREATE INDEX landsraad_task_faction_contributions_faction_id_idx ON landsraad_task_faction_contributions ("faction_id");

CREATE INDEX landsraad_task_faction_contributions_task_idx ON landsraad_task_faction_contributions ("task_id");

CREATE INDEX landsraad_task_player_contributions_faction_id_idx ON landsraad_task_player_contributions ("faction_id");

CREATE INDEX landsraad_task_player_contributions_player_id_idx ON landsraad_task_player_contributions ("player_id");

CREATE INDEX landsraad_task_player_contributions_task_idx ON landsraad_task_player_contributions ("task_id");

CREATE INDEX landsraad_task_progress_faction_id_idx ON landsraad_task_progress ("faction_id");

CREATE INDEX landsraad_task_progress_player_player_id_fk_idx ON landsraad_task_progress_player ("player_id");

CREATE INDEX landsraad_task_progress_task_id_idx ON landsraad_task_progress ("task_id");

CREATE INDEX landsraad_task_reveal_state_faction_id_idx ON landsraad_task_reveal_state ("faction_id");

CREATE INDEX landsraad_task_reveal_state_task_id_idx ON landsraad_task_reveal_state ("task_id");

CREATE INDEX landsraad_task_rewards_task_id_idx ON landsraad_task_rewards ("task_id");

CREATE INDEX landsraad_task_term_id_idx ON landsraad_tasks ("term_id");

CREATE INDEX landsraad_task_winning_faction_id_idx ON landsraad_tasks ("winning_faction_id");

CREATE INDEX landsraad_votes_decree_id_idx ON landsraad_decree_votes ("decree_id");

CREATE INDEX landsraad_votes_player_id_idx ON landsraad_decree_votes ("player_id");

CREATE INDEX markers_area_id ON markers ("area_id");

CREATE INDEX markers_marker_type_idx ON markers ("marker_type");

CREATE INDEX permission_actor_rank_actor_id_fk_idx ON permission_actor_rank ("permission_actor_id");

CREATE INDEX permission_actor_rank_player_id_fk_idx ON permission_actor_rank ("player_id");

CREATE INDEX placeables_owner_entity_id_idx ON placeables ("owner_entity_id");

CREATE INDEX player_access_code_idx ON player_access_codes ("character_id");

CREATE INDEX player_markers_discovery_level ON player_markers ("discovery_level");

CREATE INDEX player_markers_markers_fk_idx ON player_markers ("marker_hash_id","dimension_index","map_name");

CREATE INDEX player_markers_player_id_fk_idx ON player_markers ("player_id");

CREATE INDEX player_respawn_locations_character_id_fkey_idx ON player_respawn_locations ("character_id");

CREATE INDEX player_respawn_locations_dimension_idx ON player_respawn_locations ("dimension");

CREATE INDEX player_respawn_locations_id_fkey_idx ON player_respawn_locations ("id");

CREATE INDEX player_respawn_locations_locator_actor_id_fkey_idx ON player_respawn_locations ("locator_actor_id");

CREATE INDEX player_respawn_locations_map_idx ON player_respawn_locations ("map");

CREATE INDEX player_state_account_id_idx ON player_state ("account_id");

CREATE INDEX player_state_logoff_persistence_expiry_time_idx ON player_state ("logoff_persistence_end_time");

CREATE INDEX player_state_player_controller_id_idx ON player_state ("player_controller_id");

CREATE INDEX player_state_player_pawn_id_fk_idx ON player_state ("player_pawn_id");

CREATE INDEX player_state_player_state_id_fk_idx ON player_state ("player_state_id");

CREATE INDEX player_state_reconnect_grace_period_end_idx ON player_state ("reconnect_grace_period_end");

CREATE INDEX player_tags_tagx ON player_tags ("tag");

CREATE INDEX recovered_vehicles_character_id_idx ON recovered_vehicles ("character_id");

CREATE INDEX recovered_vehicles_time_stored_idx ON recovered_vehicles ("time_stored");

CREATE INDEX specialization_keystones_map_idx ON specialization_keystones_map ("name");

CREATE INDEX vehicle_modules_vehicle_id_idx ON vehicle_modules ("vehicle_id");

