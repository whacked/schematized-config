# COMMON
JSONNET_SCHEMAS_DIRECTORY := generators/schemas
JSONNET_SCHEMAS_FILES     := $(wildcard \
							 $(JSONNET_SCHEMAS_DIRECTORY)/*.schema.jsonnet \
							 )
JSON_SCHEMAS_DIRECTORY    := src/autogen/schemas
JSON_SCHEMAS_FILES        := $(patsubst $(JSONNET_SCHEMAS_DIRECTORY)/%.jsonnet,$(JSON_SCHEMAS_DIRECTORY)/%.json,$(JSONNET_SCHEMAS_FILES))
TS_INTERFACES_DIRECTORY   := src/autogen/interfaces
TS_INTERFACES_FILES       := $(patsubst $(JSON_SCHEMAS_DIRECTORY)/%.schema.json,$(TS_INTERFACES_DIRECTORY)/%.ts,$(JSON_SCHEMAS_FILES))

print_var=$(info $(info $1 has $(words $($1)) values:) $(foreach F,$($1), $(info - $F)))

$(call print_var,JSONNET_SCHEMAS_FILES)
$(call print_var,JSON_SCHEMAS_FILES)
$(call print_var,TS_INTERFACES_FILES)


$(JSON_SCHEMAS_DIRECTORY)/%.json: $(JSONNET_SCHEMAS_DIRECTORY)/%.jsonnet
	mkdir -p $(dir $@)
	jsonnet $< | tee $@

$(TS_INTERFACES_DIRECTORY)/%.ts: $(JSON_SCHEMAS_DIRECTORY)/%.schema.json
	mkdir -p $(dir $@)
	json2ts $< | tee $@


# autogen schemas and interfaces
autogens: json-schemas ts-interfaces

json-schemas: $(JSON_SCHEMAS_FILES)
ts-interfaces: $(TS_INTERFACES_FILES)
