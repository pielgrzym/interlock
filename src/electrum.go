package main

import (
	"log/syslog"
	"net/http"
	"strings"
)


func createWallet(w http.ResponseWriter, r *http.Request) (res jsonObject) {
	var newSeed string
	var password string

	req, err := parseRequest(r)

	if err != nil {
		return errorResponse(err, "")
	}

	err = validateRequest(req, []string{"password:s"})
	password = req["password"].(string)

	if err != nil {
		return errorResponse(err, "")
	}

	mkseed_args := []string{conf.mountPoint + "/electrum_wallet"}
	mkseed_cmd := "/usr/bin/electrum_mkseed"


	newSeed, err = execCommand(mkseed_cmd, mkseed_args, false, "")

	if err != nil {
		return
	}

	status.Log(syslog.LOG_NOTICE, "Created seed for new Electrum wallet")

	mkwallet_args := []string{conf.mountPoint + "/electrum_wallet",  password}
	mkwallet_cmd := "/usr/bin/electrum_mkwallet"

	status.Log(syslog.LOG_NOTICE, "Created new Electrum wallet")

	_, err = execCommand(mkwallet_cmd, mkwallet_args, false, strings.TrimSpace(newSeed))

	if err != nil {
		return
	}

	res = jsonObject{
		"status":   "OK",
		"response": map[string]interface{}{
			"seed": strings.TrimSpace(newSeed),
		},
	}

	return
}
