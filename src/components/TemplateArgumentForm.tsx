import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";
import type { TemplatePrompt } from "../utils/TemplateExpander";

interface TemplateArgumentFormProps {
  prompts: TemplatePrompt[];
  onSubmit: (values: { [label: string]: string }) => void;
}

// Collects values for {{ask:Label}} tokens before a snippet action runs.
export default function TemplateArgumentForm({ prompts, onSubmit }: TemplateArgumentFormProps) {
  const { pop } = useNavigation();

  return (
    <Form
      navigationTitle="Fill In Snippet Values"
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Insert Snippet"
            onSubmit={(values: Form.Values) => {
              pop();
              onSubmit(values as { [label: string]: string });
            }}
          />
        </ActionPanel>
      }
    >
      <Form.Description text={`This snippet needs ${prompts.length === 1 ? "a value" : `${prompts.length} values`}.`} />
      {prompts.map((prompt) => (
        <Form.TextField
          key={prompt.label}
          id={prompt.label}
          title={prompt.label}
          defaultValue={prompt.defaultValue}
          placeholder={`Enter ${prompt.label}`}
        />
      ))}
    </Form>
  );
}
