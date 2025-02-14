local TweenService = game:GetService("TweenService")
local RunService = game:GetService("RunService")
local Players = game:GetService("Players")
local UserInputService = game:GetService("UserInputService")
local Lighting = game:GetService("Lighting")

local THEME = {
	PRIMARY = Color3.fromRGB(123, 31, 162),
	SECONDARY = Color3.fromRGB(32, 32, 32),
	ACCENT_1 = Color3.fromRGB(255, 64, 129),
	ACCENT_2 = Color3.fromRGB(0, 229, 255),
	ACCENT_3 = Color3.fromRGB(123, 31, 162),
	GRADIENT_1 = Color3.fromRGB(123, 31, 162),
	GRADIENT_2 = Color3.fromRGB(255, 64, 129),
	BACKGROUND_1 = Color3.fromRGB(13, 13, 13),
	BACKGROUND_2 = Color3.fromRGB(18, 18, 18),
	SURFACE = Color3.fromRGB(30, 30, 30),
	TEXT_PRIMARY = Color3.fromRGB(255, 255, 255),
	TEXT_SECONDARY = Color3.fromRGB(189, 189, 189),
	SHADOW = Color3.fromRGB(0, 0, 0),
	GLOW = Color3.fromRGB(255, 64, 129)
}

local gui = Instance.new("ScreenGui")
gui.IgnoreGuiInset = true
gui.ZIndexBehavior = Enum.ZIndexBehavior.Global
gui.Parent = Players.LocalPlayer:WaitForChild("PlayerGui")

local blur = Instance.new("BlurEffect")
blur.Size = 0
blur.Parent = Lighting

local backgroundFrame = Instance.new("Frame")
backgroundFrame.Size = UDim2.new(1, 0, 1, 0)
backgroundFrame.BackgroundColor3 = THEME.BACKGROUND_1
backgroundFrame.BorderSizePixel = 0
backgroundFrame.Parent = gui

local function createDynamicGradient()
	local gradient = Instance.new("Frame")
	gradient.Size = UDim2.new(2, 0, 2, 0)
	gradient.Position = UDim2.new(-0.5, 0, -0.5, 0)
	gradient.BackgroundTransparency = 0.9
	gradient.Parent = backgroundFrame

	local gradientImage = Instance.new("ImageLabel")
	gradientImage.Size = UDim2.new(1, 0, 1, 0)
	gradientImage.BackgroundTransparency = 1
	gradientImage.Image = "rbxassetid://6073763717"
	gradientImage.ImageColor3 = THEME.ACCENT_1
	gradientImage.ImageTransparency = 0.8
	gradientImage.Parent = gradient

	return gradient
end

local gradients = {}
for i = 1, 3 do
	gradients[i] = createDynamicGradient()
end

spawn(function()
	local rotation = 0
	while true do
		rotation = rotation + 0.1
		for i, gradient in ipairs(gradients) do
			gradient.Rotation = rotation + (120 * i)
		end
		RunService.RenderStepped:Wait()
	end
end)

local mainFrame = Instance.new("Frame")
mainFrame.Size = UDim2.new(0.45, 0, 0.8, 0)
mainFrame.Position = UDim2.new(0.275, 0, 1.2, 0)
mainFrame.BackgroundColor3 = THEME.SURFACE
mainFrame.BackgroundTransparency = 0.05
mainFrame.ClipsDescendants = true
mainFrame.Parent = gui

local mainCorner = Instance.new("UICorner")
mainCorner.CornerRadius = UDim.new(0.02, 0)
mainCorner.Parent = mainFrame

local glowEffect = Instance.new("ImageLabel")
glowEffect.Size = UDim2.new(1.2, 0, 1.2, 0)
glowEffect.Position = UDim2.new(-0.1, 0, -0.1, 0)
glowEffect.BackgroundTransparency = 1
glowEffect.Image = "rbxassetid://7734041065"
glowEffect.ImageColor3 = THEME.GLOW
glowEffect.ImageTransparency = 0.9
glowEffect.Parent = mainFrame

local function createParticleSystem()
	local container = Instance.new("Frame")
	container.Size = UDim2.new(1, 0, 1, 0)
	container.BackgroundTransparency = 1
	container.ClipsDescendants = true
	container.Parent = mainFrame

	for i = 1, 50 do
		local particle = Instance.new("Frame")
		local size = math.random(2, 4)
		particle.Size = UDim2.new(0, size, 0, size)
		particle.Position = UDim2.new(math.random(), 0, math.random(), 0)
		particle.BorderSizePixel = 0
		particle.BackgroundColor3 = Color3.fromRGB(
			math.random(200, 255),
			math.random(200, 255),
			math.random(200, 255)
		)
		particle.BackgroundTransparency = 0.9
		particle.Parent = container

		local particleCorner = Instance.new("UICorner")
		particleCorner.CornerRadius = UDim.new(1, 0)
		particleCorner.Parent = particle

		spawn(function()
			local posX, posY = math.random(), math.random()
			local speedX, speedY = (math.random() - 0.5) * 0.3, (math.random() - 0.5) * 0.3
			while true do
				posX = posX + speedX
				posY = posY + speedY
				if posX > 1 then posX = 0 elseif posX < 0 then posX = 1 end
				if posY > 1 then posY = 0 elseif posY < 0 then posY = 1 end
				particle.Position = UDim2.new(posX, 0, posY, 0)
				RunService.Heartbeat:Wait()
			end
		end)
	end
end

createParticleSystem()

local function createShadowEffect(parent)
	local shadow = Instance.new("ImageLabel")
	shadow.Size = UDim2.new(1.1, 0, 1.1, 0)
	shadow.Position = UDim2.new(-0.05, 0, -0.05, 0)
	shadow.BackgroundTransparency = 1
	shadow.Image = "rbxassetid://7743878857"
	shadow.ImageColor3 = THEME.SHADOW
	shadow.ImageTransparency = 0.6
	shadow.ZIndex = parent.ZIndex - 1
	shadow.Parent = parent
	return shadow
end

createShadowEffect(mainFrame)

local function createNeomorphicButton(text, position, icon)
	local container = Instance.new("Frame")
	container.Size = UDim2.new(0.85, 0, 0.12, 0)
	container.Position = position
	container.AnchorPoint = Vector2.new(0.5, 0)
	container.BackgroundColor3 = THEME.SURFACE
	container.BackgroundTransparency = 0
	container.Parent = mainFrame

	local buttonCorner = Instance.new("UICorner")
	buttonCorner.CornerRadius = UDim.new(0.3, 0)
	buttonCorner.Parent = container

	local innerShadow = createShadowEffect(container)
	innerShadow.Position = UDim2.new(0, 0, 0, 0)
	innerShadow.Size = UDim2.new(1, 0, 1, 0)

	local gradient = Instance.new("UIGradient")
	gradient.Color = ColorSequence.new({
		ColorSequenceKeypoint.new(0, THEME.GRADIENT_1),
		ColorSequenceKeypoint.new(1, THEME.GRADIENT_2)
	})
	gradient.Transparency = NumberSequence.new({
		NumberSequenceKeypoint.new(0, 0.9),
		NumberSequenceKeypoint.new(1, 0.8)
	})
	gradient.Rotation = 45
	gradient.Parent = container

	local buttonGlow = Instance.new("ImageLabel")
	buttonGlow.Size = UDim2.new(1.2, 0, 1.2, 0)
	buttonGlow.Position = UDim2.new(-0.1, 0, -0.1, 0)
	buttonGlow.BackgroundTransparency = 1
	buttonGlow.Image = "rbxassetid://7734041065"
	buttonGlow.ImageColor3 = THEME.ACCENT_1
	buttonGlow.ImageTransparency = 0.9
	buttonGlow.Parent = container

	local label = Instance.new("TextLabel")
	label.Size = UDim2.new(0.7, 0, 1, 0)
	label.Position = UDim2.new(0.15, 0, 0, 0)
	label.BackgroundTransparency = 1
	label.Font = Enum.Font.GothamBlack
	label.Text = text
	label.TextColor3 = THEME.TEXT_PRIMARY
	label.TextSize = 24
	label.Parent = container

	if icon then
		local iconImage = Instance.new("ImageLabel")
		iconImage.Size = UDim2.new(0.12, 0, 0.7, 0)
		iconImage.Position = UDim2.new(0.05, 0, 0.15, 0)
		iconImage.BackgroundTransparency = 1
		iconImage.Image = icon
		iconImage.ImageColor3 = THEME.TEXT_PRIMARY
		iconImage.Parent = container

		label.Position = UDim2.new(0.22, 0, 0, 0)
		label.Size = UDim2.new(0.73, 0, 1, 0)
	end

	local button = Instance.new("TextButton")
	button.Size = UDim2.new(1, 0, 1, 0)
	button.BackgroundTransparency = 1
	button.Text = ""
	button.Parent = container

	local function createRipple(x, y)
		local ripple = Instance.new("Frame")
		ripple.Position = UDim2.new(0, x, 0, y)
		ripple.Size = UDim2.new(0, 0, 0, 0)
		ripple.AnchorPoint = Vector2.new(0.5, 0.5)
		ripple.BackgroundColor3 = THEME.TEXT_PRIMARY
		ripple.BackgroundTransparency = 0.8
		ripple.Parent = container

		local rippleCorner = Instance.new("UICorner")
		rippleCorner.CornerRadius = UDim.new(0.5, 0)
		rippleCorner.Parent = ripple

		local rippleSize = math.max(container.AbsoluteSize.X, container.AbsoluteSize.Y) * 2
		TweenService:Create(ripple, TweenInfo.new(0.5), {Size = UDim2.new(0, rippleSize, 0, rippleSize), BackgroundTransparency = 1}):Play()
		game.Debris:AddItem(ripple, 0.5)
	end

	button.MouseButton1Down:Connect(function(x, y)
		createRipple(x - container.AbsolutePosition.X, y - container.AbsolutePosition.Y)
		TweenService:Create(container, TweenInfo.new(0.1), {Size = UDim2.new(0.82, 0, 0.11, 0)}):Play()
	end)

	button.MouseButton1Up:Connect(function()
		TweenService:Create(container, TweenInfo.new(0.1), {Size = UDim2.new(0.85, 0, 0.12, 0)}):Play()
	end)

	button.MouseEnter:Connect(function()
		TweenService:Create(gradient, TweenInfo.new(0.3), {
			Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.7),
				NumberSequenceKeypoint.new(1, 0.6)
			})
		}):Play()
		TweenService:Create(buttonGlow, TweenInfo.new(0.3), {
			ImageTransparency = 0.7
		}):Play()
	end)

	button.MouseLeave:Connect(function()
		TweenService:Create(gradient, TweenInfo.new(0.3), {
			Transparency = NumberSequence.new({
				NumberSequenceKeypoint.new(0, 0.9),
				NumberSequenceKeypoint.new(1, 0.8)
			})
		}):Play()
		TweenService:Create(buttonGlow, TweenInfo.new(0.3), {
			ImageTransparency = 0.9
		}):Play()
	end)

	return button
end

local title = Instance.new("TextLabel")
title.Size = UDim2.new(0.8, 0, 0.15, 0)
title.Position = UDim2.new(0.1, 0, 0.05, 0)
title.BackgroundTransparency = 1
title.Font = Enum.Font.GothamBlack
title.Text = "ULTRA MODERN"
title.TextColor3 = THEME.TEXT_PRIMARY
title.TextSize = 42
title.Parent = mainFrame

local subtitle = Instance.new("TextLabel")
subtitle.Size = UDim2.new(0.8, 0, 0.05, 0)
subtitle.Position = UDim2.new(0.1, 0, 0.15, 0)
subtitle.BackgroundTransparency = 1
subtitle.Font = Enum.Font.GothamMedium
subtitle.Text = "PREMIUM INTERFACE"
subtitle.TextColor3 = THEME.ACCENT_1
subtitle.TextSize = 18
subtitle.Parent = mainFrame

local playButton = createNeomorphicButton("PLAY NOW", UDim2.new(0.5, 0, 0.25, 0), "rbxassetid://8285095339")
local shopButton = createNeomorphicButton("STORE", UDim2.new(0.5, 0, 0.4, 0), "rbxassetid://8284931999")
local inventoryButton = createNeomorphicButton("INVENTORY", UDim2.new(0.5, 0, 0.55, 0), "rbxassetid://8285002304")
local settingsButton = createNeomorphicButton("SETTINGS", UDim2.new(0.5, 0, 0.7, 0), "rbxassetid://8285002304")
local quitButton = createNeomorphicButton("EXIT", UDim2.new(0.5, 0, 0.85, 0), "rbxassetid://8285042344")

TweenService:Create(blur, TweenInfo.new(0.8), {Size = 24}):Play()
TweenService:Create(mainFrame, TweenInfo.new(0.8, Enum.EasingStyle.Bounce), {Position = UDim2.new(0.275, 0, 0.1, 0)}):Play()

local dragging, dragInput, dragStart, startPos
local function update(input)
	local delta = input.Position - dragStart
	TweenService:Create(mainFrame, TweenInfo.new(0.16), {
		Position = UDim2.new(startPos.X.Scale, startPos.X.Offset + delta.X, startPos.Y.Scale, startPos.Y.Offset + delta.Y)
	}):Play()
end

mainFrame.InputBegan:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseButton1 then
		dragging = true
		dragStart = input.Position
		startPos = mainFrame.Position
		input.Changed:Connect(function()
			if input.UserInputState == Enum.UserInputState.End then
				dragging = false
			end
		end)
	end
end)

mainFrame.InputChanged:Connect(function(input)
	if input.UserInputType == Enum.UserInputType.MouseMovement then
		dragInput = input
	end
end)

UserInputService.InputChanged:Connect(function(input)
	if input == dragInput and dragging then
		update(input)
	end
end)

quitButton.MouseButton1Click:Connect(function()
	TweenService:Create(blur, TweenInfo.new(0.8), {Size = 0}):Play()
	TweenService:Create(mainFrame, TweenInfo.new(0.8), {Position = UDim2.new(0.275, 0, 1.2, 0)}):Play()
	wait(1)
	gui:Destroy()
end)
