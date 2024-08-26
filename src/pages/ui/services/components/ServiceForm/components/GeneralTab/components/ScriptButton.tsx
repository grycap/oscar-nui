import useServicesContext from "@/pages/ui/services/context/ServicesContext";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

function ScriptButton() {
  const { formService, setFormService } = useServicesContext();

  const [uploadMethod, setUploadMethod] = useState<"file" | "url">("file");
  const [fileContent, setFileContent] = useState<string>("");
  const [url, setUrl] = useState<string>("");

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = e.target?.result as string;
        setFileContent(content);
        setFormService((prevService) => ({
          ...prevService,
          script: content,
        }));
      };
      reader.readAsText(file);
    }
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newUrl = event.target.value;
    setUrl(newUrl);
    setFormService((prevService) => ({
      ...prevService,
      script: newUrl,
    }));
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "row",
        gap: "10px",
        alignItems: "end",
      }}
    >
      <div>
        <Label>Script upload method</Label>
        <Select
          value={uploadMethod}
          onValueChange={(value) => setUploadMethod(value as "file" | "url")}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Select upload method" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="file">File Upload</SelectItem>
            <SelectItem value="url">URL</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {uploadMethod === "file" ? (
        <div>
          <Input type="file" onChange={handleFileUpload} className="bg-white" />
        </div>
      ) : (
        <Input
          type="url"
          placeholder="Enter script URL"
          value={url}
          onChange={handleUrlChange}
          width={"275px"}
        />
      )}
    </div>
  );
}

export default ScriptButton;
