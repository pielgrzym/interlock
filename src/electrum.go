package main

import (
	"log/syslog"
	"net/http"
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
	mkseed_cmd := "/usb/bin/electrum_mkseed"

	status.Log(syslog.LOG_NOTICE, "Created seed for new Electrum wallet")

	newSeed, err = execCommand(mkseed_cmd, mkseed_args, false, "")

	if err != nil {
		return
	}

	mkwallet_args := []string{conf.mountPoint + "/electrum_wallet", newSeed, password}
	mkwallet_cmd := "/usb/bin/electrum_mkwallet"

	status.Log(syslog.LOG_NOTICE, "Created new Electrum wallet")

	_, err = execCommand(mkwallet_cmd, mkwallet_args, false, "")

	if err != nil {
		return
	}

	res = jsonObject{
		"status":   "OK",
		"response": map[string]interface{}{
			"seed": newSeed,
		},
	}

	return
}
