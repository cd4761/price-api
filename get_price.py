import pyupbit

bit_price = pyupbit.get_current_price("KRW-BTC")
price = pyupbit.get_current_price("BTC-TON")
current_price = bit_price * price
print(type(current_price))
print(price)
print(current_price)
print(current_price * 1181)
# print("Current TON price is %s won"&(current_price))