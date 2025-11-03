/**
 * Validates contract metadata JSON structure
 * Ensures the JSON file contains required top-level keys and valid contract information
 */

export interface ContractMetadata {
  source?: {
    hash?: string;
    language?: string;
    compiler?: string;
    build_info?: {
      rust_toolchain?: string;
      cargo_contract_version?: string;
      build_mode?: string;
    };
  };
  contract?: {
    name?: string;
    version?: string;
    authors?: string[];
  };
  image?: unknown;
  version?: number;
  types?: unknown[];
  storage?: unknown;
  spec?: unknown;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  data?: ContractMetadata;
}

/**
 * Validates that the JSON file has the correct structure
 * Checks for:
 * - Valid JSON format
 * - Required source.hash field
 * - Required contract.name field
 * - Presence of top-level keys (source, contract, spec, types, storage, version)
 */
export function validateContractMetadata(
  fileContent: string
): ValidationResult {
  const errors: ValidationError[] = [];
  let data: ContractMetadata | undefined;

  // Step 1: Validate JSON format
  try {
    data = JSON.parse(fileContent);
  } catch (error) {
    return {
      isValid: false,
      errors: [
        {
          field: "json",
          message:
            "Invalid JSON format. Please ensure the file is valid JSON.",
        },
      ],
    };
  }

  if (!data || typeof data !== "object") {
    return {
      isValid: false,
      errors: [
        {
          field: "root",
          message:
            "JSON must be an object. The file appears to be empty or invalid.",
        },
      ],
      data,
    };
  }

  // Step 2: Validate source.hash (required)
  if (!data.source?.hash) {
    errors.push({
      field: "source.hash",
      message: "Missing required field: source.hash",
    });
  } else if (typeof data.source.hash !== "string") {
    errors.push({
      field: "source.hash",
      message: "source.hash must be a string",
    });
  }

  // Step 3: Validate contract.name (required)
  if (!data.contract?.name) {
    errors.push({
      field: "contract.name",
      message: "Missing required field: contract.name",
    });
  } else if (typeof data.contract.name !== "string") {
    errors.push({
      field: "contract.name",
      message: "contract.name must be a string",
    });
  }

  // Step 4: Validate top-level keys exist
  const requiredTopLevelKeys = [
    "source",
    "contract",
    "spec",
    "types",
    "version",
  ];

  for (const key of requiredTopLevelKeys) {
    if (!(key in data)) {
      errors.push({
        field: key,
        message: `Missing top-level key: ${key}`,
      });
    }
  }

  // Step 5: Validate types is an array if present
  if ("types" in data && !Array.isArray(data.types)) {
    errors.push({
      field: "types",
      message: "types must be an array",
    });
  }

  // Step 6: Validate spec is an object if present
  if ("spec" in data && (!data.spec || typeof data.spec !== "object")) {
    errors.push({
      field: "spec",
      message: "spec must be an object",
    });
  }

  return {
    isValid: errors.length === 0,
    errors,
    data: errors.length === 0 ? data : undefined,
  };
}

/**
 * Parses a file and validates contract metadata
 * Handles file reading and validation
 */
export async function validateContractFile(
  file: File
): Promise<ValidationResult> {
  // Validate file type
  if (file.type !== "application/json" && !file.name.endsWith(".json")) {
    return {
      isValid: false,
      errors: [
        {
          field: "file",
          message: "File must be a JSON file (.json)",
        },
      ],
    };
  }

  // Read file content
  try {
    const content = await file.text();
    return validateContractMetadata(content);
  } catch (error) {
    return {
      isValid: false,
      errors: [
        {
          field: "file",
          message: `Failed to read file: ${error instanceof Error ? error.message : "Unknown error"}`,
        },
      ],
    };
  }
}

/**
 * Generates a user-friendly error message from validation errors
 */
export function getValidationErrorMessage(errors: ValidationError[]): string {
  if (errors.length === 0) return "";

  if (errors.length === 1) {
    return errors[0].message;
  }

  // Group by field for cleaner presentation
  const grouped = errors.reduce(
    (acc, error) => {
      if (!acc[error.field]) {
        acc[error.field] = [];
      }
      acc[error.field].push(error.message);
      return acc;
    },
    {} as Record<string, string[]>
  );

  const messages = Object.entries(grouped)
    .map(([field, msgs]) => {
      if (msgs.length === 1) {
        return msgs[0];
      }
      return `${field}: ${msgs.join(", ")}`;
    })
    .slice(0, 3); // Show max 3 errors

  let message = messages.join("\n");
  if (errors.length > 3) {
    message += `\n...and ${errors.length - 3} more errors`;
  }

  return message;
}
