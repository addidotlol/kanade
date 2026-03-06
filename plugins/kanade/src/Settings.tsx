import React, { useCallback, useState } from "react";
import { LunaSettings, LunaSwitchSetting } from "@luna/ui";

import { storage } from "./index";

export const Settings = React.memo(() => {
	const [enabled, setEnabled] = useState(storage.enabled);

	const handleToggle = useCallback((_: unknown, checked: boolean) => {
		storage.enabled = checked;
		setEnabled(checked);
	}, []);

	return (
		<LunaSettings title="Kanade">
			<LunaSwitchSetting
				title="Enable Server"
				desc={`HTTP/SSE server on port ${storage.port}`}
				checked={enabled}
				onChange={handleToggle}
			/>
		</LunaSettings>
	);
});
