package main

import (
	"encoding/json"
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

	_, err = execCommand(mkwallet_cmd, mkwallet_args, false, strings.TrimSpace(newSeed))

	status.Log(syslog.LOG_NOTICE, "Created new Electrum wallet")

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

func electrumCmd(args[]string, input string) (j jsonObject, err error) {
	var json_response string

	cmd := "/usr/bin/electrum"
	json_response, err = execCommand(cmd, args, false, input)

	if err != nil {
		return nil, err
	}

	d := json.NewDecoder(strings.NewReader(string(json_response[:])))
	d.UseNumber()

	err = d.Decode(&j)

	return j, err
}

type jsonList []interface{}

func electrumCmdArr(args[]string, input string) (j jsonList, err error) {
	var json_response string

	cmd := "/usr/bin/electrum"
	json_response, err = execCommand(cmd, args, false, input)

	if err != nil {
		return nil, err
	}

	d := json.NewDecoder(strings.NewReader(string(json_response[:])))
	d.UseNumber()

	err = d.Decode(&j)

	return j, err
}

func getBalance(w http.ResponseWriter) (res jsonObject) {
	var err error
	var balance jsonObject

	args := []string{"getbalance"}

	balance, err = electrumCmd(args, "")

	if err != nil {
		return
	}

	status.Log(syslog.LOG_NOTICE, "Checked wallet balance")

	res = jsonObject{
		"status":   "OK",
		"response": map[string]interface{}{
			"balance": balance["confirmed"],
		},
	}

	return
}

func listAddresses(w http.ResponseWriter) (res jsonObject) {
	var err error
	var result jsonList

	args := []string{"listaddresses"}

	result, err = electrumCmdArr(args, "")

	if err != nil {
		// status.Log(syslog.LOG_NOTICE, err.Error())
		return
	}

	res = jsonObject{
		"status":   "OK",
		"response": map[string]jsonList {
			"addresses": result,
		},
	}

	return
}

func electrumStatus(w http.ResponseWriter) (res jsonObject) {
	var err error
	var resp jsonObject

	args := []string{"daemon", "status"}

	resp, err = electrumCmd(args, "")

	if err != nil {
		return
	}

	res = jsonObject{
		"status":   "OK",
		"response": map[string]interface{}{
			"status": resp,
		},
	}

	return
}
