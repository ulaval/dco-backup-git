#!/bin/sh
# Script to start a backup on Openshift
# This script creates a Pod linked to a persistent volume so that the backup can occur.
# Ex: ./job-run <server> <namespace> [token]

RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

server=$1
namespace=$2
token=$3

# Adding timestamp to pod name
now=`date '+%Y-%m-%d-%H-%M-%S'`
objectName="dti-backup-git-$now"

onError()
{
	echo -e "${RED}Script failed.${NC}"
	exit 1
}

echo "Creating pod..."
oc new-app --server=$server --namespace=$namespace --token=$token \
    -f=templates/job.yaml --name=$objectName -l=sys=dti-backup-git -p=NAME=$objectName || onError

echo "Waiting for pod to start..."
status=$(oc get pod/$objectName --template={{.status.phase}} --server=$server --namespace=$namespace --token=$token)
while [ $status == "Pending" ]
do
    sleep 1
    status=$(oc get pod/$objectName --template={{.status.phase}} --server=$server --namespace=$namespace --token=$token)
done

echo "New status is $status"

# Showing pod logs in console
oc logs --server=$server --namespace=$namespace --token=$token pod/$objectName --follow || onError

status=$(oc get pod/$objectName --template={{.status.phase}} --server=$server --namespace=$namespace --token=$token)

if [ "$status" == "Succeeded" ]; then
    echo -e "${GREEN}Script succeeded.${NC}"
    exit 0
fi

echo -e "${RED}Script failed with status $status.${NC}"
exit 1
