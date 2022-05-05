import { FC, useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { ReactComponent as ArrowRightIcon } from "src/assets/icons/arrow-right.svg";
import useConfirmationStyles from "src/views/transaction-confirmation/transaction-confirmation.styles";
import Header from "src/views/shared/header/header.view";
import { useTransactionContext } from "src/contexts/transaction.context";
import Card from "src/views/shared/card/card.view";
import Typography from "src/views/shared/typography/typography.view";
import routes from "src/routes";
import Button from "src/views/shared/button/button.view";
import Error from "src/views/shared/error/error.view";
import { useProvidersContext } from "src/contexts/providers.context";
import Icon from "src/views/shared/icon/icon.view";
import { useBridgeContext } from "src/contexts/bridge.context";
import { getChainName } from "src/utils/labels";
import { trimDecimals } from "src/utils/amounts";

const TransactionConfirmation: FC = () => {
  const classes = useConfirmationStyles();
  const [incorrectMessageNetwork, setIncorrectMessageNetwork] = useState<string>();
  const { bridge } = useBridgeContext();
  const { account, connectedProvider, changeNetwork } = useProvidersContext();
  const navigate = useNavigate();
  const { transaction, setTransaction } = useTransactionContext();

  const checkCorrectNetwork = useCallback(async () => {
    if (transaction && connectedProvider) {
      const networkFrom = await transaction.from.provider.getNetwork();
      const connectedProviderNetwork = await connectedProvider.getNetwork();
      return connectedProviderNetwork.chainId === networkFrom.chainId;
    }
  }, [connectedProvider, transaction]);

  const onClick = async () => {
    if (transaction) {
      const { token, amount, from, to } = transaction;
      if (!(await checkCorrectNetwork())) {
        try {
          await changeNetwork(from);
        } catch (error) {
          setIncorrectMessageNetwork(`Switch to ${getChainName(from)} to continue`);
          return;
        }
        setIncorrectMessageNetwork(undefined);
      }
      if (account.status === "successful") {
        bridge({
          from,
          token,
          amount,
          to,
          destinationAddress: account.data,
        })
          .then(() => {
            navigate(routes.activity.path);
            setTransaction(undefined);
          })
          .catch(console.error);
      }
    }
  };

  useEffect(() => {
    void checkCorrectNetwork().then((checked) => {
      if (checked) {
        setIncorrectMessageNetwork(undefined);
      }
    });
  }, [checkCorrectNetwork, connectedProvider]);

  useEffect(() => {
    if (!transaction) {
      navigate(routes.home.path);
    }
  }, [navigate, transaction]);

  if (!transaction) {
    return null;
  }

  return (
    <>
      <Header title="Confirm Transfer" backTo="home" />
      <Card className={classes.card}>
        <Icon url={transaction.token.logoURI} size={46} className={classes.icon} />
        <Typography type="h1">
          {`${trimDecimals(transaction.amount, transaction.token.decimals)} ${
            transaction.token.symbol
          }`}
        </Typography>
        <div className={classes.chainsRow}>
          <div className={classes.chainBox}>
            <transaction.from.Icon /> {getChainName(transaction.from)}
          </div>
          <ArrowRightIcon className={classes.arrow} />
          <div className={classes.chainBox}>
            <transaction.to.Icon /> {getChainName(transaction.to)}
          </div>
        </div>
        <div className={classes.fees}>
          <Typography type="body2" className={classes.betweenFees}>
            Estimated gas fee
          </Typography>
          <Typography type="body1" className={classes.fee}>
            <Icon url={transaction.token.logoURI} size={20} />
            {`~ ${trimDecimals(transaction.estimatedFee, transaction.token.decimals)} ${
              transaction.token.symbol
            }`}
          </Typography>
        </div>
      </Card>
      <div className={classes.button}>
        <Button onClick={onClick}>Transfer</Button>
        {incorrectMessageNetwork && <Error error={incorrectMessageNetwork} />}
      </div>
    </>
  );
};

export default TransactionConfirmation;
