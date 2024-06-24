/*
	JSON-to-Rust
	by ChatGPT

	A simple utility to translate JSON into a Rust struct definition.
*/

function jsonToRust(json, typename, flatten = true, example = false, allOmitempty = false)
{
	let data;
	let scope;
	let rust = "";
	let tabs = 0;

	const seen = {};
	const stack = [];
	let accumulator = "";
	let innerTabs = 0;
	let parent = "";

	try
	{
		data = JSON.parse(json.replace(/(:\s*\[?\s*-?\d*)\.0/g, "$1.1")); // hack that forces floats to stay as floats
		scope = data;
	}
	catch (e)
	{
		return {
			rust: "",
			error: e.message
		};
	}

	typename = format(typename || "AutoRoot");
	append(`#[derive(Serialize, Deserialize)]\n`)
	append(`#[serde(rename_all = "camelCase")]\n`)
	append(`pub struct ${capitalizeFirstLetter(typename)} `);

	parseScope(scope);

	var r= {
		rust: flatten
			? rust += accumulator
			: rust
	};
	// console.log(rust)
	// console.log(r)
return r;

	function parseScope(scope, depth = 0)
	{
		if (typeof scope === "object" && scope !== null)
		{
			if (Array.isArray(scope))
			{
				let sliceType;
				const scopeLength = scope.length;

				for (let i = 0; i < scopeLength; i++)
				{
					const thisType = rustType(scope[i]);
					if (!sliceType)
						sliceType = thisType;
					else if (sliceType != thisType)
					{
						sliceType = mostSpecificPossibleRustType(thisType, sliceType);
						
						if (sliceType == "String")
							break;
					}
				}
				const slice = flatten && ["struct", "slice"].includes(sliceType)
					? `Vec&lt;${capitalizeFirstLetter(parent)}&gt;`
					: `Vec&lt;String&gt;`;
				if (flatten && depth >= 2)
					appender(slice);
				else
					appender(slice);
				if (sliceType == "struct") {
					const allFields = {};

					// for each field counts how many times appears
					for (let i = 0; i < scopeLength; i++)
					{
						const keys = Object.keys(scope[i])
						for (let k in keys)
						{
							
							let keyname = keys[k];
							if (!(keyname in allFields)) {
								allFields[keyname] = {
									value: scope[i][keyname],
									count: 0
								}
							}
							else {
								
								const existingValue = allFields[keyname].value;
								const currentValue = allFields[keyname];

								if (compareObjects(existingValue, currentValue)) {
									const comparisonResult = compareObjectKeys(
										Object.keys(currentValue),
										Object.keys(existingValue)
									)
									if (!comparisonResult) {
										keyname = `${keyname}_${uuidv4()}`;
										allFields[keyname] = {
											value: currentValue,
											count: 0
										};
									}
								}
							}
							allFields[keyname].count++;
						}
					}

					// create a common struct with all fields found in the current array
					// omitempty dict indicates if a field is optional
					const keys = Object.keys(allFields), struct = {}, omitempty = {};
					for (let k in keys)
					{
						const keyname = keys[k], elem = allFields[keyname];

						struct[keyname] = elem.value;
						omitempty[keyname] = elem.count != scopeLength;
					}
					parseStruct(depth + 1, innerTabs, struct, omitempty); // finally parse the struct !!
				}
				else if (sliceType == "slice") {
					console.log(scope[0])
					parseScope(scope[0], depth)
				}
				else {
					if (flatten && depth >= 2) {
						appender(sliceType || "String");
						// appender("pub" +  sliceType);
					} else {
						append(sliceType || "String");
						// appender("pub" +  sliceType);
					}
				}
			}
			else
			{
				if (flatten) {
					if (depth >= 2){
						appender("pub "+capitalizeFirstLetter(parent))
						// appender("pub-----" +  parent);
					}
					else {
						append(capitalizeFirstLetter(parent))
						// appender("pub-----" +  parent);
					}
				}
				parseStruct(depth + 1, innerTabs, scope);
			}
		}
		else {
			// appender(rustType(scope));
			if (flatten && depth >= 2){
				appender(rustType(scope));
			}
			else {
				append(rustType(scope));
			}
		}
	}
	function camelToSnakeWithPreservedEnd(str) {
		// 找到最后一个大写字母的位置
		let lastUpperCaseIndex = -1;
		for (let i = str.length - 1; i >= 0; i--) {
			if (str[i] === str[i].toUpperCase() && str[i] !== '_') {
				lastUpperCaseIndex = i;
				break;
			}
		}
	
		// 将字符串分为两部分
		let mainPart = str.slice(0, lastUpperCaseIndex);
		let endPart = str.slice(lastUpperCaseIndex);
	
		// 将主部分转换为下划线分隔
		mainPart = mainPart.replace(/([a-z])([A-Z])/g, '$1_$2').toLowerCase();
	
		return mainPart + endPart;
	}
	function parseStruct(depth, innerTabs, scope, omitempty)
	{
		if (flatten) {
			stack.push(
				depth >= 2
				? "\n"
				: ""
			)
		}

		const seenTypeNames = [];

		if (flatten && depth >= 2)
		{
			parent=capitalizeFirstLetter(parent)
			const parentType = `pub struct ${parent}`;
			// console.log(parentType)
			const scopeKeys = formatScopeKeys(Object.keys(scope));

			// this can only handle two duplicate items
			// future improvement will handle the case where there could
			// three or more duplicate keys with different values
			if (parent in seen && compareObjectKeys(scopeKeys, seen[parent])) {
				stack.pop();
				return
			}
			seen[parent] = scopeKeys;
			appender(`#[derive(Serialize, Deserialize)]\n`)
			appender(`#[serde(rename_all = "camelCase")]\n`)
			appender(`${parentType} {\n`);
			++innerTabs;
			const keys = Object.keys(scope);
			// console.log(keys)
			for (let i in keys)
			{
				const keyname = getOriginalName(keys[i]);
				indenter(innerTabs)
				const typename = uniqueTypeName(format(keyname), seenTypeNames)
				seenTypeNames.push(typename)
				// console.log(typename)
				appender("pub "+camelToSnakeWithPreservedEnd(keyname)+": ");
				// console.log(rust)
				parent = typename
				parseScope(scope[keys[i]], depth);
				appender(',\n');
			}
			indenter(--innerTabs);
			appender("}");
		}
		else
		{
			append("{\n");
			++tabs;
			const keys = Object.keys(scope);
			for (let i in keys)
			{
				const keyname = getOriginalName(keys[i]);
				indent(tabs);
				const typename = uniqueTypeName(format(keyname), seenTypeNames)
				seenTypeNames.push(typename)
				append("pub "+typename+": ");
				parent = typename
				parseScope(scope[keys[i]], depth);
				append(',\n');
			}
			indent(--tabs);
			append("}");
		}
		if (flatten)
			accumulator += stack.pop();
	}

	function indent(tabs)
	{
		for (let i = 0; i < tabs; i++)
			rust += '    ';
	}
	function capitalizeFirstLetter(str) {
		if (str.length === 0) {
			return str;
		}
		return str.charAt(0).toUpperCase() + str.slice(1);
	}
	function append(str)
	{
		rust += str;
	}

	function indenter(tabs)
	{
		for (let i = 0; i < tabs; i++)
			stack[stack.length - 1] += '    ';
	}

	function appender(str)
	{
		stack[stack.length - 1] += str;
	}

	// Generate a unique name to avoid duplicate struct field names.
	// This function appends a number at the end of the field name.
	function uniqueTypeName(name, seen) {
		if (seen.indexOf(name) === -1) {
			return name;
		}

		let i = 0;
		while (true) {
			let newName = name + i.toString();
			if (seen.indexOf(newName) === -1) {
				return newName;
			}

			i++;
		}
	}

	// Sanitizes and formats a string to make an appropriate identifier in Rust
	function format(str)
	{
		str = formatNumber(str);

		let sanitized = toSnakeCase(str).replace(/[^a-z0-9_]/ig, "")
		if (!sanitized) {
			return "naming_failed";
		}

		// After sanitizing the remaining characters can start with a number.
		// Run the sanitized string again trough formatNumber to make sure the identifier is num_[0-9] or zero_... instead of 1.
		return formatNumber(sanitized)
	}

	// Adds a prefix to a number to make an appropriate identifier in Rust
	function formatNumber(str)
	{
		if (/^\d+$/.test(str))
		{
			const ones = {
				"0": "zero",
				"1": "one",
				"2": "two",
				"3": "three",
				"4": "four",
				"5": "five",
				"6": "six",
				"7": "seven",
				"8": "eight",
				"9": "nine"
			};

			return str.split('').map(c => ones[c]).join('_');
		}
		else
		{
			return str;
		}
	}

	// Converts a string to snake case (lowercase with underscores)
	function toSnakeCase(str)
	{
		// snake case (lower with underscores)
		return str.replace(/([^\W_]+[^\s-]*) */g, function(txt)
		{
			return txt.toLowerCase();
			
		}).replace(/ /g, "_");
	}

	function getOriginalName(name)
	{
		return name.split("_")[0]
	}

	function compareObjectKeys(a, b)
	{
		const aKeys = JSON.stringify(a.sort()), bKeys = JSON.stringify(b.sort());
		return aKeys == bKeys;
	}

	function compareObjects(a, b)
	{
		const aType = rustType(a), bType = rustType(b);

		return aType == bType;
	}

	function mostSpecificPossibleRustType(typ1, typ2)
	{
		if (typ1 == "f64" && typ2 == "i32")
			return "f64";
		if (typ1 == "i32" && typ2 == "f64")
			return "f64";
		return "Option&lt;String&gt;";
	}

	// https://stackoverflow.com/a/2117523/265298
	function uuidv4() {
		return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
	}

	function formatScopeKeys(keys){
		const formattedKeys = []
		for (let i = 0; i < keys.length; i++){
			const originalKey = keys[i]
			const keyname = getOriginalName(originalKey);
			const typename = format(keyname)
			formattedKeys.push(typename)
		}
		return formattedKeys
	}
}

function rustType(val)
{
	if (val === null)
		return "Option&lt;String&gt;";

	switch (typeof val)
	{
		case "string":
			return "Option&lt;String&gt;";
		case "number":
			return "Option&lt;String&gt;";
		case "boolean":
			return "Option&lt;String&gt;";
		case "object":
			if (Array.isArray(val))
				return "Option&lt;Vec&lt;String&gt;&gt;";
			return "struct";
		default:
			return "Option&lt;String&gt;";
	}
}
